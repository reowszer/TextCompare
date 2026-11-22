# Text Compare

*A handy little tool for writing, rewriting, and keeping the good bits.*

Compare two drafts side by side, see exactly what changed, and merge the parts you want to keep. Comparisons run offline in your browser.

## Install on macOS

You’ll need Git and a recent web browser. From a folder where you want to keep the project, run:

```sh
git clone https://github.com/reowszer/TextCompare.git
cd TextCompare
./bin/textcompare
```

To run `textcompare` from any directory, create a symlink while you’re in the project folder:

```sh
mkdir -p "$HOME/.local/bin"
ln -s "$PWD/bin/textcompare" "$HOME/.local/bin/textcompare"
```

If `textcompare` returns `command not found`, run this in your current terminal. Add the same line to `~/.zshrc` to make it available in new terminals.

```sh
export PATH="$HOME/.local/bin:$PATH"
```

Keep the cloned folder in place so the symlink can find it. On other operating systems, open `dist/index.html` directly in a recent browser.

## Compare two texts

1. Paste your drafts into **Original** and **Revised**, or use **Open file** to select plain-text files. You can also drag a file into either pane.
2. Click **Compare** or press **Cmd + Enter** on macOS (**Ctrl + Enter** elsewhere).
3. Review the red deletions, green additions, and similarity score. Use **Previous change** and **Next change** to jump between edits, or turn on **Show changes only** to hide matching lines.

**Ignore case** and **Ignore whitespace** apply to the comparison and similarity score.

## Merge two drafts

1. With both drafts loaded, click **Merge drafts**.
2. Choose **Keep left** or **Keep right** for each group of adjacent changes. The app jumps to the next undecided group. Use **Previous change** or **Next change** to revisit a choice.
3. Check the **Merged draft** preview. Once every group has a choice, use **Copy** or **Download text** to save the result.

The preview uses the left side for undecided groups. If the browser blocks clipboard access, **Copy** selects the merged text so you can copy it with your keyboard.
