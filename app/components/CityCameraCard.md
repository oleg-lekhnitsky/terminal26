# Street type

Grindelwald / Glecksteinhütte west view uses Foto-Webcam's stable `current/1200.jpg` snapshot (verified HTTP 200, 1200×675). Grand Haven / Lake Michigan was removed from the rotation at the user’s request after playback failed.

Copiapó / Desierto de Atacama south view is included as a camera snapshot, credited to DGAC Chile. `/api/atacama-camera` resolves the newest timestamped JPEG from the official DGAC camera 23 page, caching that lookup for 60 seconds. It uses the existing snapshot refresh and rotation behavior; no dated image URL is hardcoded.

Direct HLS video, discovered through OpenCCTV's public camera directory. No YouTube embeds or extracted YouTube streams.

Active sources:
- Seoul National University Station: Seoul TOPIS, `https://topiscctv1.eseoul.go.kr/sd2/ch11.stream/playlist.m3u8`
- New York / Times Square South: EarthCam, `https://videos-3.earthcam.com/fecnetwork/28925.flv/playlist.m3u8`

Both returned HTTP 200 manifests with CORS enabled; video segments decoded as H.264 (Seoul 720×480, New York 1280×720). Frames were visually inspected and contain actual street footage. Browser playback has not been verified.

The `cities` array in CityCameraCard.vue controls the city label, location, credit, source link, and stream. The city name overlays its matching feed using the selected project font. The card rotates after 24 seconds from playback starting and recreates the video element so old footage cannot appear with a new city label. Connection attempts time out after 20 seconds; failed sources advance after 4 seconds. Native HLS is used where supported, otherwise HLS.js loads dynamically. Muted inline autoplay has a manual play fallback. Players and timers are disposed when offscreen, hidden, or unmounted.

Tokyo and Bangkok were researched but are not active: Tokyo directory entries checked were YouTube or still images, and the legacy Tokyo MX direct candidate failed. Bangkok's ITIC and Bang Wa direct candidates returned 404; the Department of Highways HTTPS source failed its TLS connection. Do not substitute still images or a different city under these labels.

OpenCCTV is used for discovery and source links, not as a runtime API. No Windy API integration or API key is required for these two direct sources. External stream availability can change.

Berestovitsa entry (Belarus Customs) was added at the user's request. This source is a JPEG at `https://www.customs.gov.by/webcam/gr05.jpg`, verified as 1920×1080. It is explicitly labeled “Camera snapshot”, refreshed every 10 seconds while visible, and participates in the same 24-second rotation. It is not a video feed.

San Diego / SR-163 removed from the rotation at the user’s request because playback was not working.
