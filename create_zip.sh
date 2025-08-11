#!/bin/bash

current_version=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo "Current version: $current_version"

# Parse major and minor
major=$(echo $current_version | cut -d. -f1)
minor=$(echo $current_version | cut -d. -f2)

echo "1) Minor update (${major}.$((minor + 1)))"
echo "2) Major update ($((major + 1)).0)"
echo "3) Keep current version ($current_version)"
echo ""
echo "Note: Chrome Web Store requires version increment for updates"
read -p "Choose (1/2/3): " choice

case $choice in
    1) new_version="${major}.$((minor + 1))" ;;
    2) new_version="$((major + 1)).0" ;;
    3) new_version="$current_version" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

if [ "$new_version" != "$current_version" ]; then
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" manifest.json
    echo "Updated to version $new_version"
else
    echo "Keeping version $current_version"
fi

rm -f extension.zip
zip -r extension.zip . -x "node_modules/*" "public/*" "chrome-store/*" "*.sh" "*.md" "*.zip" "*.txt" "*.yaml" "*.git*" 