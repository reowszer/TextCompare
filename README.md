# Text Compare

*A handy little tool for writing, rewriting, and keeping the good bits.*

Compare and merge drafts side by side in your browser. All text processing stays on your device.

**Contents**

[Workspace](#workspace) · [Compare](#compare) · [Merge](#merge) · [Supported files](#supported-files) · [Install](#install)

## Workspace

| Area | Left | Right |
| --- | --- | --- |
| **Top** | **Original diff** · Original text and deletions | **Revised diff** · Revised text and additions |
| **Middle** | **Compare**, **Swap sides**, **Clear**, **Merge drafts** | Comparison options, similarity score, and change navigation |
| **Bottom** | **Original** · Editable text and **Open file** | **Revised** · Editable text and **Open file** |

The top panes scroll together to keep matching lines aligned. The bottom editors scroll independently.

## Compare

1. Paste text into the **Original** and **Revised** editors, use either **Open file** button, or drop files onto the editors.
2. Click **Compare** in the middle toolbar. The shortcut is **Cmd + Enter** on macOS or **Ctrl + Enter** elsewhere.
3. Review red deletions, green additions, and character highlights above. Use **Previous change**, **Next change**, or **Show changes only** to focus on edits.

Keep editing below while the last result stays visible. Click **Compare** again to refresh it. **Ignore case** and **Ignore whitespace** also apply to the similarity score.

## Merge

1. Click **Merge drafts** and choose **Keep left** or **Keep right** for each group of adjacent changes.
2. Review the **Merged draft** preview below the editors. Use **Previous change** and **Next change** to revisit choices.
3. Once every group is resolved, click **Copy** or **Download text**.

## Supported files

Both **Open file** buttons and drag-and-drop accept the same formats.

| Type | Files |
| --- | --- |
| Plain text | `.txt`, LaTeX (`.tex`), Markdown, CSV, TSV, logs, and source code |
| Word | `.docx`, `.doc` (Word 97–2003) |
| Excel | `.xlsx`, `.xls` |
| PowerPoint | `.pptx`, `.ppt` |

Office files open as editable plain text. Use unlocked files up to 32 MiB, with up to 128 MiB of expanded content for newer Office formats. Plain text supports UTF-8, UTF-16 with a BOM, and Windows-1252 for recognized text files.

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
