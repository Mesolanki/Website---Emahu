import os

path = r"e:\emahu\Website---Emahu\admin-emahu\lint_output.txt"
if os.path.exists(path):
    # Try different encodings
    for encoding in ['utf-16', 'utf-16-le', 'utf-16-be', 'utf-8', 'latin-1']:
        try:
            with open(path, 'r', encoding=encoding) as f:
                content = f.read()
                if len(content.strip()) > 0:
                    print(f"--- Encoding: {encoding} ---")
                    # print lines that contain "error" or "warning"
                    lines = content.split('\n')
                    for line in lines:
                        if 'error' in line.lower() or 'warning' in line.lower() or 'problems' in line.lower():
                            print(line)
                    break
        except Exception as e:
            pass
else:
    print("File not found")
