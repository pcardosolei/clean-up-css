import * as path from "path";
import * as fs from "fs";
const directory = path.join(__dirname);
// Recursively find all .css and .scss files in the directory and subdirectories
function getAllStyleFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllStyleFiles(filePath));
        }
        else if (file.endsWith(".css") || file.endsWith(".scss")) {
            results.push(filePath);
        }
    });
    return results;
}
/*
/* read the classes and ids that exists on the style files including the nested files and store them on a Set
/* --
/* example:
  .class1 {
    color: red;
  }
  .class2 {
    color: blue;
  }
  #id1 {
    color: green;
  }

  new Set(['.class1', '.class2', '#id1'])

  example 2:

  .class1 {
    color: red;

    &.selected {
    color:pink
    }
  }

  new Set(['.class1', '.class1.selected', '.class2', '#id1'])

  */
// Extract classes and ids, including nested selectors, from CSS/SCSS content
function extractClassesAndIds() {
    const styleFiles = getAllStyleFiles(directory);
    const classesAndIds = new Set();
    styleFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        // Use a stack to track selector nesting
        const lines = content.split(/\r?\n/);
        const stack = [];
        lines.forEach((line) => {
            const trimmed = line.trim();
            // Match selector lines
            const selectorMatch = trimmed.match(/^([.#][\w-]+)([^{]*)\{/);
            if (selectorMatch) {
                let selector = selectorMatch[1];
                if (!selector)
                    return;
                // Handle nested selectors with &
                if (stack.length > 0 && selector.includes("&")) {
                    selector = selector.replace("&", stack[stack.length - 1]);
                }
                else if (stack.length > 0) {
                    selector = stack[stack.length - 1] + selector;
                }
                stack.push(selector);
                classesAndIds.add(selector);
            }
            else if (trimmed === "}") {
                stack.pop();
            }
        });
        // Fallback: also match any standalone selectors (non-nested)
        const regex = /([.#][\w-]+)/g;
        let match;
        while ((match = regex.exec(content))) {
            classesAndIds.add(match[0]);
        }
    });
    return classesAndIds;
}
function main(...args) {
    console.log(args);
    const classesAndIds = extractClassesAndIds();
    console.log(classesAndIds);
}
//# sourceMappingURL=index.js.map