# CORS Configuration for Deployment

## Server (Render) Configuration

Make sure your server on Render has the following environment variables set:

- `CLIENT_URL`: Set this to `https://tubular-cascaron-da9fc9.netlify.app` (your Netlify app URL)
- `CORS_ALLOW_ALL`: Set to `false` for production environments

## Client (Netlify) Configuration

Make sure your client on Netlify has the following environment variables set:

- `VITE_API_URL`: Set this to `https://ipl-auctiongame-mern-cj.onrender.com` (your Render backend URL)

## Testing CORS Configuration

After deploying the updated server code, you can test if CORS is working correctly by:

1. Visiting `https://ipl-auctiongame-mern-cj.onrender.com/api/cors-test` in your browser
2. Making a request to this endpoint from your Netlify app

## Common CORS Issues

If you're still having issues:

1. Make sure both frontend and backend are deployed with the latest code changes
2. Check that all environment variables are set correctly
3. Clear browser cache or try in an incognito window
4. Check server logs for any CORS-related errors
