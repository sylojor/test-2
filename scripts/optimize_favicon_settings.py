import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')

# Fix 1: Add optimization to the MAIN favicon 16x16 PNG creation (image upload section)
# Find: ".png({ palette: true, compressionLevel: 9 })" in the 16x16 resize context for favicon
# The one that needs fixing is right after:
# "// Image favicon — create minimal 16x16 ICO (single image, smallest possible)"
# .resize(16, 16, ...) followed by .png({ palette: true, compressionLevel: 9 })

# Find the "Image favicon" section
img_fav_marker = "// Image favicon — create minimal 16x16 ICO"
img_fav_idx = content.find(img_fav_marker)
if img_fav_idx >= 0:
    # Find the .png setting after this marker
    png_idx = content.find('.png({ palette: true, compressionLevel: 9 })', img_fav_idx)
    if png_idx >= 0 and png_idx < img_fav_idx + 2000:
        # Check it's the 16x16 resize (not 32x32)
        between = content[img_fav_idx:png_idx]
        if '.resize(16, 16' in between:
            content = content[:png_idx] + '.png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })' + content[png_idx+len('.png({ palette: true, compressionLevel: 9 })'):]
            print("✅ Fixed main favicon 16x16 PNG settings")
        else:
            print("❌ This PNG setting is not after 16x16 resize")
    else:
        print("❌ Could not find .png setting in image favicon section")

# Fix 2: Also save favicon-16x16.png with the optimized settings
# Currently favicon-16x16.png is saved from png16Buffer which is the optimized PNG
# This is correct - no change needed

# Fix 3: Remove the 32x32 creation to save space (it's optional and adds storage)
# Actually, keep it but optimize it too
# Find the 32x32 PNG setting after "Also create 32x32 for modern browsers"
marker_32 = "// Also create 32x32 for modern browsers"
idx_32 = content.find(marker_32)
if idx_32 >= 0:
    png_idx_32 = content.find('.png({ palette: true, compressionLevel: 9 })', idx_32)
    if png_idx_32 >= 0 and png_idx_32 < idx_32 + 1000:
        content = content[:png_idx_32] + '.png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })' + content[png_idx_32+len('.png({ palette: true, compressionLevel: 9 })'):]
        print("✅ Fixed 32x32 favicon PNG settings")

# Verify all changes
png_settings_count = content.count('.png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })')
print(f"\nOptimized PNG settings count: {png_settings_count}")

# Check all png settings
import re
png_settings = re.findall(r'.png\(\{[^}]+\}\)', content)
for i, p in enumerate(png_settings):
    marker = ''
    # Find which section this belongs to
    idx = content.find(p)
    before = content[max(0,idx-500):idx]
    if 'favicon' in before.lower() or '16, 16' in before or '32, 32' in before:
        marker = '[FAVICON]'
    elif 'logo' in before.lower() or '256, 256' in before or '64, 64' in before:
        marker = '[LOGO]'
    print(f'PNG setting {i+1} {marker}: {p}')

# Write back
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'w') as f:
    f.write(content)

print(f"\n✅ File saved. Size: {len(content)} chars")

sftp.close()
ssh.close()
