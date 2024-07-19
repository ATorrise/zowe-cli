const fs = require('fs');
const path = require('path');

// Define the new row to be added
const newRow = '|  TEST  | 2025-03      | **Active** | [Link](#)     | [Link](#) |';

const mdFilePath = path.join(__dirname, '../RELEASE_HISTORY.md');

fs.readFile(mdFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Find the table and insert the new row after the second row
  const lines = data.split('\n');
  let tableLineCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|') && lines[i].endsWith('|')) {
      tableLineCount++;
      if (tableLineCount === 2) {
        // Insert the new row after the second row
        lines.splice(i + 1, 0, newRow);
        break;
      }
    }
  }

  // Write the updated content back to the markdown file
  fs.writeFile(mdFilePath, lines.join('\n'), 'utf8', (err) => {
    if (err) {
      console.error('Error writing the file:', err);
      return;
    }
    console.log('Markdown file updated successfully.');
  });
});
