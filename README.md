# Text Compare

*A handy little tool for writing, rewriting, and keeping the good bits.*

Compare and merge two drafts in your browser. All text processing stays on your device.

## Install

On macOS, clone the project with Git and launch it in your default browser.

```sh
git clone https://github.com/reowszer/TextCompare.git
cd TextCompare
./bin/textcompare
```

To run `textcompare` from any directory, run these commands from the project folder.

```sh
mkdir -p "$HOME/.local/bin"
ln -s "$PWD/bin/textcompare" "$HOME/.local/bin/textcompare"
export PATH="$HOME/.local/bin:$PATH"
```

If needed, add the `export` line to `~/.zshrc` for new terminals. Keep the project folder at the same path so the link stays valid. On other operating systems, open `dist/index.html` directly in a recent browser.

## Compare

1. Paste text into the two lower editors, or open or drop a plain-text file on either side.
2. Click **Compare** or press **Cmd + Enter** on macOS (**Ctrl + Enter** elsewhere).
3. Review the aligned diff and similarity score above. Use **Previous change**, **Next change**, or **Show changes only** to focus on edits.

Keep editing below while the last result stays visible. Click **Compare** again to refresh it. **Ignore case** and **Ignore whitespace** also apply to the similarity score.

## Merge

Click **Merge drafts** and choose **Keep left** or **Keep right** for each group of changes. Use **Previous change** and **Next change** to revisit choices. Once every group is resolved, use **Copy** or **Download text** under **Merged draft**.
