# Presenter photo guide

The presenter image is what Halai uses to build the character that speaks the script. Quality of the photo directly determines quality of the output.

## What works best

| Trait | Why |
|---|---|
| **Face clearly visible** | Eyes, mouth, jawline all in frame. The model needs to read the face — not just the silhouette. |
| **Neutral expression** or **slight smile** | Strong expressions in the source push through into every frame of the generated video. A neutral resting face animates more naturally into different lines. |
| **Even lighting** | Soft, front-lit. Avoid hard shadows under the eyes, blown-out highlights, or mixed warm + cool light. |
| **Plain or simple background** | The model can keep a busy background but a plain one helps the presenter stay the visual focus. |
| **Single person in frame** | Crop out anyone else. The model picks the largest face if multiple are present, but the result is less predictable. |
| **Head and shoulders visible** | Tight headshot + upper torso reads best. Pure face-only crops can produce stiffer head motion. |
| **Eyes looking at camera** | The presenter will appear to address the viewer. Sideways gaze produces a "looking offscreen" feel. |

## What to avoid

- Sunglasses, masks, or anything occluding the face.
- Heavy filters (beauty filters that smooth skin to plastic, anime filters).
- Pixelated, low-res photos. The model amplifies grain.
- Backlit silhouettes where the face is dark.
- Group photos where you've forgotten to crop.
- Selfies where the phone or hand is in front of part of the face.

## Sizing and format

| Property | Recommended |
|---|---|
| Resolution | At least 768×768. Higher is better. |
| Aspect | Roughly square or portrait. Wide landscapes get cropped. |
| Format | JPG or PNG. Both fine. |
| Color | Color, not B&W (B&W output looks washed out). |
| File size | Under ~10 MB. Data URLs work but plain `https://` URLs are faster. |

If the user uploads from camera roll, the photo is usually fine as-is. If they paste a URL from social media, double-check it's a direct image URL (ends in `.jpg` / `.png`), not a profile-page URL.

## Cropping advice

If the photo has the right face but extra context (background, other people), crop the user's image before uploading:

- **Headshot crop:** square, face in the upper-third, ears just inside the frame, shoulders at the bottom.
- **Half-body crop:** portrait 3:4, face in the upper-third, mid-torso at the bottom.

Halai handles the model's body off-frame automatically — the presenter image only needs to lock the face and ideally the upper torso.

## Reusing presenters

The same presenter image can drive an entire campaign — script changes, aesthetic stays constant. Save the hosted URL after the first upload so you can pass it back without re-uploading.

```
upload_reference_image returns: { url: "https://media.hallah.ai/...", already_hosted: false }
```

Reuse that URL as `presenter_image_url` on subsequent calls. Halai caches characters for consistent identity across calls in the same connection.

## Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Stylized / cartoon avatar as presenter | Output looks uncanny, lip-sync is loose | Use a real photo |
| Group photo, no crop | Wrong person speaks the script | Crop to the intended presenter |
| Sunglasses on | Eyes never appear naturally | Use a photo without sunglasses |
| Low-light selfie | Output is grainy and dim | Re-shoot in window light |
| Beauty filter at max | Output looks plastic, motion is stiff | Use the unfiltered version |
| Hand or phone over face | Generated video tries to keep the obstruction | Use a photo without the obstruction |
