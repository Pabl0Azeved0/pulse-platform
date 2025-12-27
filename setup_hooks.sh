#!/bin/bash

HOOK_FILE=".git/hooks/pre-commit"

echo "#!/bin/bash" > $HOOK_FILE

# 1. Run the formatter
echo "echo '🎨 Running Pre-commit Formatting...'" >> $HOOK_FILE
echo "make format > /dev/null 2>&1" >> $HOOK_FILE

# 2. Check if formatting succeeded
echo "if [ \$? -ne 0 ]; then" >> $HOOK_FILE
echo "  echo '❌ Formatting failed. Commit aborted.'" >> $HOOK_FILE
echo "  exit 1" >> $HOOK_FILE
echo "fi" >> $HOOK_FILE

# 3. THE FIX: Only re-add files that are ALREADY in the staging area
# We grab the list of currently staged files and update them.
echo "echo '🔄 Updating staged files...'" >> $HOOK_FILE
echo "git diff --name-only --cached | xargs -r git add" >> $HOOK_FILE

echo "exit 0" >> $HOOK_FILE

chmod +x $HOOK_FILE
echo "✅ Smart Pre-commit hook installed!"