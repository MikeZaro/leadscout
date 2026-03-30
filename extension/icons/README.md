# Extension Icons

LeadScout branded icons - target/crosshair design with purple gradient.

## Included Icons
- `icon16.png` - 16x16 pixels (toolbar small)
- `icon48.png` - 48x48 pixels (extension management)  
- `icon128.png` - 128x128 pixels (Chrome Web Store)
- `icon.svg` - Vector source file

## Design
- **Symbol:** Target/crosshair (🎯 inspired)
- **Background:** Purple gradient (#7c3aed → #667eea)
- **Foreground:** White rings and crosshair lines
- **Corners:** Rounded (24px radius on 128px base)

## Regenerating Icons

If you need to regenerate the PNG icons from the SVG source:

```bash
# Using Inkscape (recommended)
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png

# Using ImageMagick
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png

# Using rsvg-convert
rsvg-convert icon.svg -w 16 -h 16 -o icon16.png
rsvg-convert icon.svg -w 48 -h 48 -o icon48.png
rsvg-convert icon.svg -w 128 -h 128 -o icon128.png
```

## Brand Colors
- Primary: #667eea (purple)
- Accent: #7c3aed (violet)
- Foreground: #ffffff (white)
