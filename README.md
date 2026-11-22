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

1. Paste text into the two lower editors, or use **Open file** or drag and drop on either side.
2. Click **Compare** or press **Cmd + Enter** on macOS (**Ctrl + Enter** elsewhere).
3. Review the aligned diff and similarity score above. Use **Previous change**, **Next change**, or **Show changes only** to focus on edits.

Keep editing below while the last result stays visible. Click **Compare** again to refresh it. **Ignore case** and **Ignore whitespace** also apply to the similarity score.

### Supported files

| Type | Files |
| --- | --- |
| Plain text | `.txt`, LaTeX (`.tex`), Markdown, CSV, TSV, logs, and source code |
| Word | `.docx`, `.doc` (Word 97–2003) |
| Excel | `.xlsx`, `.xls` |
| PowerPoint | `.pptx`, `.ppt` |

Office files open as editable plain text. Use unlocked files up to 32 MiB, with up to 128 MiB of expanded content for newer Office formats. Plain text supports UTF-8, UTF-16 with a BOM, and Windows-1252 for recognized text files.

## Merge

Click **Merge drafts** and choose **Keep left** or **Keep right** for each group of changes. Use **Previous change** and **Next change** to revisit choices. Once every group is resolved, use **Copy** or **Download text** under **Merged draft**.
