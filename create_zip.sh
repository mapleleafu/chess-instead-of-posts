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

echo ""
echo "1) Chrome (Manifest V3)"
echo "2) Firefox (Manifest V2)"
read -p "Choose browser (1/2): " browser

if [ "$new_version" != "$current_version" ]; then
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" manifest.json
    echo "Updated to version $new_version"
    # Update Firefox manifest too if it exists
    if [ -f "manifest-firefox.json" ]; then
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" manifest-firefox.json
    fi
else
    echo "Keeping version $current_version"
fi

if [ "$browser" = "2" ]; then
    if [ -f "manifest-firefox.json" ]; then
        cp manifest.json manifest-chrome.json
        cp manifest-firefox.json manifest.json
        echo "Using Firefox manifest"
    else
        echo "Error: manifest-firefox.json not found!"
        exit 1
    fi
fi

rm -f extension.zip
zip -r extension.zip . -x "node_modules/*" "public/*" "chrome-store/*" "*.sh" "*.md" "*.zip" "*.txt" "*.yaml" "*.git*" "manifest-chrome.json" "manifest-firefox.json"

if [ "$browser" = "2" ]; then
    echo "Reverting to Chrome manifest..."
    mv manifest-chrome.json manifest.json
fi