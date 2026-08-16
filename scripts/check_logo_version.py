import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'r') as f:
    content = f.read().decode('utf-8')

# Find the Image component with logoVersion
image_idx = content.find('logo.png?v=${logoVersion}')
if image_idx >= 0:
    start = max(0, image_idx-200)
    end = min(len(content), image_idx+300)
    print('=== LOGO IMAGE CONTEXT ===')
    print(content[start:end])

# Find the img element with faviconVersion  
img_idx = content.find('favicon.ico?v=${faviconVersion}')
if img_idx >= 0:
    start = max(0, img_idx-200)
    end = min(len(content), img_idx+300)
    print('=== FAVICON IMG CONTEXT ===')
    print(content[start:end])

# Also check: where is the state declaration relative to where it's used?
state_idx = content.find('[logoVersion, setLogoVersion] = useState(0)')
print(f'\nState declared at char offset: {state_idx}')

# Find first usage after component start
# The component function starts somewhere - let me find it
component_start = content.find('export function AdminContent')
if component_start < 0:
    component_start = content.find('function AdminContent')
if component_start < 0:
    component_start = content.find('AdminContent =')

print(f'Component starts at: {component_start}')
print(f'State at: {state_idx}')
print(f'Image usage at: {image_idx}')

# Check if the logoVersion is used inside a render function that might be a separate scope
# Check around the Image src usage
print('\n=== FULL CONTEXT AROUND LOGO IMAGE ===')
print(content[image_idx-500:image_idx+500])

sftp.close()
ssh.close()
