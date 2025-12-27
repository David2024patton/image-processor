const express = require('express');
const sharp = require('sharp');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'image-processor',
        version: '1.0.0'
    });
});

// Main endpoint: overlay logo on image
app.post('/overlay-logo', async (req, res) => {
    try {
        const {
            imageUrl,
            logoUrl,
            position = 'bottom-right',
            size = 'medium',
            opacity = 0.9
        } = req.body;

        // Validation
        if (!imageUrl || !logoUrl) {
            return res.status(400).json({
                error: 'Missing required parameters',
                required: ['imageUrl', 'logoUrl']
            });
        }

        console.log(`Processing image with logo overlay...`);
        console.log(`Image URL: ${imageUrl.substring(0, 50)}...`);
        console.log(`Logo URL: ${logoUrl}`);
        console.log(`Position: ${position}, Size: ${size}, Opacity: ${opacity}`);

        // Download AI-generated image
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Download logo
        const logoResponse = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        const logoBuffer = Buffer.from(logoResponse.data);

        // Get image dimensions
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        console.log(`Image size: ${metadata.width}x${metadata.height}`);

        // Calculate logo size based on image size
        const logoSizes = {
            small: Math.floor(metadata.width * 0.12),
            medium: Math.floor(metadata.width * 0.20),
            large: Math.floor(metadata.width * 0.30)
        };

        const targetLogoWidth = logoSizes[size] || logoSizes.medium;

        // Resize logo maintaining aspect ratio
        const resizedLogo = await sharp(logoBuffer)
            .resize(targetLogoWidth, null, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();

        const logoMetadata = await sharp(resizedLogo).metadata();

        console.log(`Logo size: ${logoMetadata.width}x${logoMetadata.height}`);

        // Calculate position with padding
        const padding = Math.floor(metadata.width * 0.02); // 2% of image width
        let left, top;

        switch (position) {
            case 'top-left':
                left = padding;
                top = padding;
                break;
            case 'top-right':
                left = metadata.width - logoMetadata.width - padding;
                top = padding;
                break;
            case 'bottom-left':
                left = padding;
                top = metadata.height - logoMetadata.height - padding;
                break;
            case 'bottom-right':
            default:
                left = metadata.width - logoMetadata.width - padding;
                top = metadata.height - logoMetadata.height - padding;
        }

        console.log(`Logo position: (${left}, ${top})`);

        // Apply opacity to logo if needed
        let finalLogo = resizedLogo;
        if (opacity < 1.0) {
            finalLogo = await sharp(resizedLogo)
                .ensureAlpha()
                .composite([{
                    input: Buffer.from([255, 255, 255, Math.floor(255 * opacity)]),
                    raw: {
                        width: 1,
                        height: 1,
                        channels: 4
                    },
                    tile: true,
                    blend: 'dest-in'
                }])
                .toBuffer();
        }

        // Overlay logo on image
        const watermarkedImage = await image
            .composite([{
                input: finalLogo,
                top: Math.floor(top),
                left: Math.floor(left),
                blend: 'over'
            }])
            .toBuffer();

        // Return as base64 for n8n binary data
        const base64Image = watermarkedImage.toString('base64');

        console.log(`✅ Image processed successfully (${base64Image.length} bytes)`);

        res.json({
            success: true,
            image: base64Image,
            mimeType: `image/${metadata.format}`,
            size: {
                width: metadata.width,
                height: metadata.height
            }
        });

    } catch (error) {
        console.error('❌ Error processing image:', error.message);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Image Processor Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Endpoint: POST http://localhost:${PORT}/overlay-logo`);
});
