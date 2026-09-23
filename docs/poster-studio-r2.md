# Poster studio: Cloudflare R2

The Poster studio card captures a camera photo or accepts an upload, draws live AB Terminal text on a 960 × 1200 canvas, and exports the finished PNG. Download works without R2. Clicking **Publish poster** stores that PNG in the shared gallery. The original uploaded photo, camera stream, and photo metadata are not sent to R2.

## Configure the bucket

1. In the Cloudflare dashboard, open **R2 Object Storage** and create a bucket, for example `terminal-posters`.
2. Keep the bucket private. This integration serves images through the application; it does not need an `r2.dev` public URL or bucket CORS rules.
3. Create an R2 API token with **Object Read & Write**, restricted to that bucket. Save the generated **Access Key ID** and **Secret Access Key**. These are the S3 credentials, not the Cloudflare API bearer token.
4. Copy the account ID from Cloudflare's R2 dashboard.
5. Add these values to your local `.env`, or your hosting provider's server environment variables:

```dotenv
NUXT_R2_ACCOUNT_ID=your-cloudflare-account-id
NUXT_R2_ACCESS_KEY_ID=your-r2-access-key-id
NUXT_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
NUXT_R2_BUCKET=terminal-posters
NUXT_SITE_URL=http://localhost:3000
```

Use your actual HTTPS origin for `NUXT_SITE_URL` on the deployed site. Restart the dev server or redeploy after changing server environment variables. Never put the R2 credentials in public runtime config.

Official setup: [R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/), [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/).

## Verify

1. Open Poster studio and press Refresh under **Made by you**. The Publish button should become enabled.
2. Upload a photo, enter text, select text color/placement and a font style, and download the PNG.
3. Click **Publish poster**. The new image should appear in the gallery.
4. Open the site in another browser and confirm it appears there too.
5. Try **Use camera** on HTTPS or localhost. Camera permission is required. The camera stops on capture, cancel, scrolling the card out of view, hiding the tab, or leaving the page.

## Storage and public access

- Objects live under `community-posters/v1/`, with a reverse timestamp and random UUID so listing returns newest first.
- Gallery pages contain up to 12 posters; **More posters** uses the R2 continuation cursor.
- The upload endpoint accepts PNG posters up to 5 MB and exactly 960 × 1200 pixels. Image routes only accept generated poster IDs, never arbitrary bucket keys.
- Publishing is anonymous and immediately public. The server applies a 30-second per-IP, per-process upload cooldown. For a publicly promoted deployment, configure an edge rate-limit rule for POST `/api/posters` so limits also apply across server instances.
- To remove a poster, delete its PNG from the bucket. Image responses are cached for up to one hour.
- There is no local-file fallback: before R2 configuration the editor/download still work, but nothing is presented as published.

The bucket connection must be verified with your real credentials; no bucket is created by this code.
