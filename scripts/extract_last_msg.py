import json
import sys

log_path = "/home/victor/.gemini/antigravity/brain/60bbbf44-c5f2-4f63-b67c-82226d6e9806/.system_generated/logs/overview.txt"

with open(log_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("step_index") == 141:
                content = data.get("content", "")
                # Remove the <USER_REQUEST> tags if they exist
                if content.startswith("<USER_REQUEST>\n"):
                    content = content[len("<USER_REQUEST>\n"):]
                if content.endswith("\n</USER_REQUEST>"):
                    content = content[:-len("\n</USER_REQUEST>")]
                with open("/home/victor/My projects/Jack/scripts/last_msg_full.txt", "w") as out:
                    out.write(content)
                break
        except:
            continue
