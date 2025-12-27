# Image Processor Service

Microservice for overlaying company logos on AI-generated images.

## Features

- Overlay logos at 4 positions (top-left, top-right, bottom-left, bottom-right)
- 3 logo sizes (small, medium, large)
- Adjustable opacity
- Fast processing with Sharp library
- Health check endpoint

## API

### POST /overlay-logo

**Request:**
```json
{
  "imageUrl": "https://image.pollinations.ai/...",
  "logoUrl": "https://patriotpest.pro/img/logo_trans.png",
  "position": "bottom-right",
  "size": "medium",
  "opacity": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "image": "base64EncodedImage...",
  "mimeType": "image/png",
  "size": {
    "width": 1024,
    "height": 1024
  }
}
```

### GET /health

Health check endpoint

## Deployment

### Local Development

```bash
npm install
npm start
```

### Dokploy Deployment

1. Push code to repository or use Dokploy's file upload
2. Dokploy will build using Dockerfile
3. Service runs on port 3000
4. Access via internal network: `http://image-processor:3000`

## Environment Variables

- `PORT` - Port to run on (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Usage from n8n

```javascript
POST http://image-processor:3000/overlay-logo
Body: {
  "imageUrl": "{{ $('Fetch AI Image').item.binary.data.url }}",
  "logoUrl": "{{ $('Get Context').item.json.logo_url }}",
  "position": "{{ $('Get Context').item.json.logo_position }}",
  "size": "{{ $('Get Context').item.json.logo_size }}",
  "opacity": {{ $('Get Context').item.json.logo_opacity }}
}
```

Convert response to binary data:
```javascript
$binary.data = Buffer.from($json.image, 'base64')
```
