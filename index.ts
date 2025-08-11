import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import type { ClassInfo } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively find all .css and .scss files in the directory and subdirectories
function getAllStyleFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllStyleFiles(filePath));
    } else if (file.endsWith(".css") || file.endsWith(".scss")) {
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
function extractClassesAndIds(styleFiles: string[]) {
  const classesAndIds: ClassInfo[] = [];

  styleFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = content.match(/^(\s.&)?([.#][\w-]+)([^{]*)\{/gm);

    matches &&
      matches.forEach((element) => {
        const type = element.includes("#") ? "id" : "class";
        const isNested = element.includes("&");
        let parent;

        if (isNested) {
          const size = classesAndIds.length;
          parent = classesAndIds[size - 1] || null;
        }

        classesAndIds.push({
          type,
          isNested,
          value: element,
          parent: parent || null,
        });
      });
  });
  return classesAndIds;
}

function main(...args: string[]) {
  const argFolder = args[0];

  const styleFiles = getAllStyleFiles(argFolder || __dirname);
  console.log("StyleFiles:", styleFiles);
  const classesAndIds = extractClassesAndIds(styleFiles);
  console.log(classesAndIds);
}

export default main;

const optsArguments = process.argv.slice(2);
main(...optsArguments);
