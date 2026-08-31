# SatQuery AI - Product Requirements Document

## 1. Product Goal

Build a web app where users upload satellite image(s), ask a question in simple language, and get a clear answer with map-based proof.

**Example:** "Which areas are newly flooded?"

## 2. Problem We Solve

- Satellite images are difficult for normal users to understand.
- Existing GIS tools require expert knowledge.
- Different questions need different AI models.
- Emergency teams need fast, reliable answers.
- Users need visual proof, not only a text answer.

## 3. Users

- Disaster-management officers - flood and damage analysis.
- Agriculture departments - crop and drought monitoring.
- Forest/environment officers - forest, water, and land changes.
- Urban planners - construction and encroachment tracking.
- GIS analysts, students, and NGOs - easier satellite-data analysis.

**Main demo user:** District disaster-management officer.

## 4. Main Requirements

### Image Upload

- Upload one satellite image.
- Upload two images from different dates for change detection.
- Upload optical + SAR image pair for combined analysis.
- Support GeoTIFF/TIFF; PNG/JPEG for demo data.
- Validate format, size, date, location, and pair compatibility.

### Text Query

- User asks questions in plain English.
- Show suggested questions.

**Examples:**

- "Describe this image."
- "Highlight water bodies."
- "What changed between these two dates?"
- "Has built-up area increased?"

### Smart AI Router

- Understand the query and uploaded image type.
- Automatically select the correct specialist AI model.
- Show the selected workflow/model to the user.

### AI Features Required

- Single-image visual question answering (VQA).
- Image captioning or text-guided region highlighting.
- Change detection for two images from different dates.
- Optical-SAR combined analysis.
- Fine-tune/adapt at least one model on remote-sensing data such as BigEarthNet.

### Results Screen

- Clear text answer.
- Highlighted map or image overlay.
- Before-and-after comparison for two-date images.
- Confidence score.
- Low-confidence warning.
- Model/workflow summary.
- Downloadable report.

## 5. User Flow

1. User uploads image(s).
2. User asks a question.
3. System validates the image(s).
4. AI router selects the correct model.
5. Model analyses the image(s).
6. System shows answer, map evidence, confidence, and workflow details.

## 6. Security Requirements

- Require login for protected data.
- Use roles: user, analyst, admin.
- Use HTTPS after deployment.
- Validate file type and file size before upload.
- Keep uploaded files private and use secure file names.
- Keep passwords and API keys in environment variables, never GitHub.
- Log uploads, analysis runs, report downloads, and admin actions.
- Delete demo uploads after a defined period where possible.

### If a Breach Happens

1. Block affected accounts and revoke sessions.
2. Rotate affected API keys.
3. Preserve logs for investigation.
4. Check affected users and data.
5. Inform the administrator/authority.
6. Fix, test, and document the issue.

## 7. Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS.
- **Map:** MapLibre GL JS or Leaflet.
- **Backend:** Python FastAPI.
- **AI:** PyTorch, Hugging Face, OpenCV.
- **Geospatial:** Rasterio, GDAL, GeoPandas.
- **Database:** PostgreSQL + PostGIS.
- **Storage:** Local storage for demo; S3/MinIO for deployment.
- **Deployment:** Docker and GPU server if available.

## 8. Success Criteria

- Non-expert can ask and understand a query without GIS training.
- Correct model is selected for supported questions.
- Every result has text plus map evidence.
- Low-confidence results always show a warning.
- Prepared demo inputs respond in under 30 seconds.
- Accuracy is measured on selected benchmark data.

## 9. Not in MVP

- Live data from every satellite provider.
- Fully autonomous disaster decisions.
- Training a huge model from scratch.
- Replacing GIS experts.

## 10. Presentation Line

> SatQuery AI makes satellite-image analysis simple, fast, secure, and evidence-based for non-expert decision-makers.
