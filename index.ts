import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import type { ClassInfo } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IGNORE_PATHS = [
  "node_modules",
  "coverage",
  "public",
  "app/assets/builds",
];
const IGNORE_CLASS_TEXT = [
  "img",
  "div",
  ":first-child",
  ":last-child",
  "webkit",
  ":",
  " a ",
  " p ",
];
const classesAndIds: ClassInfo[] = [];

// Recursively find all .css and .scss files in the directory and subdirectories
function getFilesByType(dir: string, typePrefix: string[]): string[] {
  if (typePrefix.length === 0) return [];
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    if (IGNORE_PATHS.some((ignore) => filePath.includes(ignore))) return;

    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesByType(filePath, typePrefix));
    } else {
      const matchingPrefixes = typePrefix.filter((prefix) =>
        file.endsWith(prefix)
      );
      matchingPrefixes.length > 0 && results.push(filePath);
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
  styleFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = content.match(/^(\s.&)?([.#][\w-]+)([^{]*)\{/gm);

    matches?.forEach((element) => {
      const valueCleaned = cleanupValue(element);
      const type = element.includes("#") ? "id" : "class";
      const isNested = element.includes("&");

      let ignoreFound = false;
      IGNORE_CLASS_TEXT.forEach((ignoreText) => {
        if (valueCleaned.includes(ignoreText)) {
          ignoreFound = true;
        }
      });

      if (ignoreFound) return;
      let parent;

      if (isNested) {
        const size = classesAndIds.length;
        parent = classesAndIds[size - 1] || null;
      }

      const existingClass = classesAndIds.find(
        (cls) => cls.value === valueCleaned
      );
      if (existingClass) existingClass.times++;
      else {
        classesAndIds.push({
          type,
          isNested,
          value: valueCleaned,
          parent: parent || null,
          found: false,
          times: 1,
        });
      }
    });
  });
}

function cleanupValue(value: string) {
  return value.replace(/[&{]/g, "").trim();
}

// working but it is not 100%
function checkFilesForExistingStyles(htmlFiles: string[]) {
  htmlFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");

    if (filePath.endsWith(".html.slim")) {
      const matches = content.match(/([.#][\w-]+)/g);
      matches?.forEach((match) => {
        const classInfo = classesAndIds.find((cls) => cls.value === match);
        if (classInfo) classInfo.found = true;
      });
    } else {
      const matchesWithClass = content.match(/class="([^"]*)"/g);
      matchesWithClass?.forEach((match) => {
        const classNames = match
          .replace(/class="/, "")
          .replace(/"/, "")
          .split(" ");

        console.log(filePath, classNames);
        classNames?.forEach((className) => {
          const classInfo = classesAndIds.find(
            (cls) =>
              cls.type === "class" && cls.value.replace(".", "") === className
          );
          if (classInfo) classInfo.found = true;
        });
      });
    }
  });
}

// Check for existing styles in HTML files
function checkStylesInFiles(htmlFiles: string[]) {
  classesAndIds.map((value) => {
    const info = value.value.split(" ");

    htmlFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      let foundAll = true;
      info.map((x) => {
        if (!content.includes(x.replace(".", "").replace("#", "")))
          foundAll = false;
      });

      if (foundAll) value.found = true;
    });
  });
}

function missingStylesToFind() {
  return classesAndIds
    .filter((cls) => !cls.found)
    .map((cls) => `${cls.type} ${cls.value} found-${cls.times}`)
    .join("\n");
}

function checkCSSThatIsNotBeingUsed() {
  const options = { encoding: "utf8", flag: "w" } as fs.WriteFileOptions;
  fs.writeFile("final.txt", missingStylesToFind(), options, (err) => {
    if (err) console.error("Error writing file:", err);
    else console.log("File written successfully!");
  });
}

function main(...args: string[]) {
  const argFolder = args[0];

  const styleFiles = getFilesByType(argFolder || __dirname, [".css", ".sass"]);
  extractClassesAndIds(styleFiles);

  const elementFiles = getFilesByType(argFolder || __dirname, [
    ".html.slim",
    ".html.erb",
    ".erb",
    ".html",
    ".tsx",
  ]);

  // checkFilesForExistingStyles(elementFiles);
  checkStylesInFiles(elementFiles);
  checkCSSThatIsNotBeingUsed();
}

export default main;

const optsArguments = process.argv.slice(2);
main(...optsArguments);
