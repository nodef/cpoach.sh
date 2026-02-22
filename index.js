#!/usr/bin/env node
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const cp   = require('child_process');
const readline = require('readline');

const PRE = '# 🍳 ';




//#region UTILS
// Escape special characters in a string for use in a regular expression.
function escapeRegExp(pat) {
  return pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// Read a text file synchronously and normalize line endings to LF.
function readTextFileSync(pth) {
  const data = fs.readFileSync(pth, 'utf8');
  return data.replace(/\r?\n|\r/g, '\n');
}


// Write a text file synchronously and normalize line endings to LF.
function writeTextFileSync(pth, text) {
  const data = text.replace(/\r?\n|\r/g, os.EOL);
  fs.writeFileSync(pth, data, 'utf8');
}


// Read a JSON file synchronously and parse it.
function readJSONFileSync(pth) {
  const text = readTextFileSync(pth);
  return JSON.parse(text);
}


// Write a JSON file synchronously and stringify it with indentation.
function writeJSONFileSync(pth, obj) {
  const text = JSON.stringify(obj, null, 2) + '\n';
  writeTextFileSync(pth, text);
}


// Prompt the user for input.
function prompt(query, def='') {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    let q = def? `${query} [${def}]: ` : `${query}: `;
    rl.question(q, answer => {
      rl.close();
      resolve(answer.trim()? answer : def);
    });
  });
}
//#endregion




//#region SECTION COMMANDS
// Remove excess section gaps (> 2).
function sectionTrim(data, prefix) {
  const pre = escapeRegExp(prefix);
  const re  = new RegExp(`^${pre}endregion\n{4,}${pre}region.*?`, 'gm');
  return data.replace(re, `${prefix}endregion\n\n\n${prefix}region`).trim() + '\n';
}


// Extract a section from a text file based on region markers.
function sectionExtract(data, prefix, name) {
  const pre = escapeRegExp(prefix);
  const re  = new RegExp(`^${pre}region ${escapeRegExp(name)}\\n([\\s\\S]*?)\\n${pre}endregion$`, 'g');
  const m   = re.exec(data);
  return m? m[1].trim() : null;
}


// Remove a section from a text file based on region markers.
function sectionRemove(data, prefix, name) {
  const pre = escapeRegExp(prefix);
  const re  = new RegExp(`^${pre}region ${escapeRegExp(name)}\\n[\\s\\S]*?\\n${pre}endregion$`, 'g');
  return data.replace(re, '');
}


// Add a section to a text file based on region markers (if it doesn't already exist).
function sectionAdd(data, prefix, name, content) {
  if (sectionExtract(data, prefix, name) != null) return data;
  return data.trim() +
    `\n\n\n` +
    `${prefix}region ${name}\n` +
    `${content.trim()}\n` +
    `${prefix}endregion\n`;
}


// Replace a section in a text file based on region markers.
function sectionReplace(data, prefix, name, content) {
  const pre = escapeRegExp(prefix);
  const re  = new RegExp(`^${pre}region ${escapeRegExp(name)}\\n([\\s\\S]*?)\\n${pre}endregion$`, 'g');
  return data.replace(re,
    `${prefix}region ${name}\n` +
    `${content.trim()}\n` +
    `${prefix}endregion\n`
  );
}


// Add or replace a section in a text file based on region markers.
function sectionAddOrReplace(data, prefix, name, content) {
  const exists = sectionExtract(data, prefix, name);
  if (exists == null) return sectionAdd(data, prefix, name, content);
  return sectionReplace(data, prefix, name, content);
}
//#endregion




//#region VERSION COMMAND
// Fetch the current version of the tool from package.json.
function fetchVersion() {
  const  p = readJSONFileSync(path.join(__dirname, 'package.json'));
  return p.version || '0.0.0';
}


// Run the `version` command, which displays the current version of the tool.
function runVersion() {
  console.error(`cpoach version ${fetchVersion()}\n`);
}
//#endregion




//#region HELP COMMAND
// Run the help command, which displays usage information.
function runHelp() {
  console.error(
    `cpoach - A C/C++ package manager using the npm registry (v${fetchVersion()})\n` +
    `\n` +
    `Usage: cpoach [command] [options]\n` +
    `\n` +
    `Commands:\n` +
    `  init          Initialize a new C/C++ project.\n` +
    `  install       Install dependencies.\n` +
    `  build         Build the project.\n` +
    `  run           Run the executable.\n` +
    `  config        Configure dependencies.\n` +
    `  format        Format code.\n` +
    `  sanitize      Run sanitizers.\n` +
    `  lint          Lint code.\n` +
    `  i | includes  Generate compiler flags for include paths.\n` +
    `\n` +
    `Options:\n` +
    `  --compiler [name]  Specify the compiler (msvc, gcc, clang). Default is gcc.\n` +
    `  --msvc             Shortcut for --compiler msvc.\n` +
    `  --gcc              Shortcut for --compiler gcc.\n` +
    `  --clang            Shortcut for --compiler clang.\n`
  );
}
//#endregion




//#region INCLUDES COMMAND
// Run the `includes` command, which generates compiler flags for include paths.
function runIncludes(opt) {
  const includes = [];
  const cwd = process.cwd();
  const pth = path.basename(cwd) === 'node_modules'? cwd : path.join(cwd, 'node_modules');
  for (const ent of fs.readdirSync(pth)) {
    if (!ent.endsWith('.c') && !ent.endsWith('.cxx')) continue;
    includes.push(path.join(pth, ent));
  }
  const FLAG = opt.compiler==='msvc'? '/I' : '-I';
  console.log(includes.map(pth => `${FLAG}"${pth}"`).join(' ').trim());
}
//#endregion



//#region INIT COMMAND
// Get the Git repository URL from the current directory, if it exists.
function gitRepoUrl() {
  try   { return cp.execSync('git config --get remote.origin.url', {encoding: 'utf8'}).trim(); }
  catch { return ''; }
}


// Get the email of the most recent Git commit author, if it exists.
function gitRecentAuthorEmail() {
  try   { return cp.execSync('git log -1 --pretty=format:%ae', {encoding: 'utf8'}).trim(); }
  catch { return ''; }
}


// Initialize .gitignore to ignore dependencies and build artifacts.
function initGitignore(cwd) {
  const pth  = path.join(cwd, '.gitignore');
  let   data = fs.existsSync(pth)? readTextFileSync(pth) : '';
  if (!/^node_modules\/$/m.test(data)) data = sectionAdd(data, PRE, 'Dependencies', `node_modules/`);
  if (!/^build\/$/m.test(data))        data = sectionAdd(data, PRE, 'Build', `build/`);
  writeTextFileSync(pth, sectionTrim(data, PRE));
}


// Initialize .npmignore to ignore dependencies and build artifacts.
function initNpmignore(cwd) {
  const pth  = path.join(cwd, '.npmignore');
  let   data = fs.existsSync(pth)? readTextFileSync(pth) : '';
  if (!/^build\/$/m.test(data)) data = sectionAdd(data, PRE, 'Build', `build/`);
  writeTextFileSync(pth, sectionTrim(data, PRE));
}


// Initialize source files based on package.json.
function initSourceFiles(cwd, pkg) {
  const p = pkg;
  const files = p.sourceFiles || ['main.cxx'];
  let    main = null;
  for (const file of files) {
    const pth = path.join(cwd, file);
    const dir = path.dirname(pth);
    if (!/\?|\*/.test(dir)) fs.mkdirSync(dir, {recursive: true});
    if ( /\?|\*/.test(file)) continue;
    if (fs.existsSync(pth))  continue;
    if (/main\.(c|cxx|cpp|cc)$/.test(file)) main = main || pth;
    fs.writeFileSync(pth, '');
  }
  if (!main) return;
  const data = readTextFileSync(main);
  if (data.trim()) return;
  writeTextFileSync(main,
    `#include <iostream>\n` +
    `\n` +
    `int main() {\n` +
    `  std::cout << "Hello, world!\\n";\n` +
    `  return 0;\n` +
    `}\n`
  );
}


// Initialize CMakeLists.txt based on package.json.
function initCMakeLists(cwd, pkg) {
  const p = pkg;
  const projectName  = p.name;
  const isExecutable = p.type === 'executable';
  const cxxStandard  = p.cmake.options.CMAKE_CXX_STANDARD || '17';
  const generator    = p.cmake.generator || null;
  const pth = path.join(cwd, 'CMakeLists.txt');
  let data  = fs.existsSync(pth)? readTextFileSync(pth) : '';
  if (!/cmake_minimum_required/.test(data)) {
    data = sectionAddOrReplace(data, PRE, 'Project details',
      `cmake_minimum_required(VERSION ${p.cmake.minVersion || '3.15'})\n` +
      `project(${projectName} VERSION ${p.version} LANGUAGES CXX)\n`
    );
  }
  data = sectionAddOrReplace(data, PRE, 'Include dependencies',
    `include(dependencies.cmake OPTIONAL)`
  );
  if (!/set\(CMAKE_CXX_STANDARD\s/.test(data)) {
    data = sectionAddOrReplace(data, PRE, 'Set C++ standard',
      `set(CMAKE_CXX_STANDARD ${cxxStandard})\n` +
      `set(CMAKE_CXX_STANDARD_REQUIRED ON)`
    );
  }
  if (isExecutable) {
    data = sectionAddOrReplace(data, PRE, 'Define executable target',
      `add_executable(${projectName} main.cxx)\n` +
      `target_include_directories(${projectName} PRIVATE include)`
    );
  }
  else {
    data = sectionAddOrReplace(data, PRE, 'Define library target',
      `add_library(${projectName} main.cxx)\n` +
      `target_include_directories(${projectName} PUBLIC include)`
    );
  }
  data = sectionAddOrReplace(data, PRE, 'Link dependencies',
    `# target_link_libraries(${projectName} PRIVATE dependencies)`
  );
  data = sectionAddOrReplace(data, PRE, 'Link system dependencies',
    `# find_package(OpenSSL REQUIRED)\n` +
    `# target_link_libraries(${projectName} PRIVATE OpenSSL::SSL)`
  );
  writeTextFileSync(pth, sectionTrim(data, PRE));
}


async function runInit() {
  const cwd = process.cwd();
  const pth = path.join(cwd, 'package.json');
  if (fs.existsSync(pth)) {
    const overwrite = await prompt('package.json already exists. Overwrite? (y/N) ');
    if (overwrite.toLowerCase() !== 'y') { console.error('Aborted.'); return; }
    else console.log();
  }
  // Gather project info
  const name    = await prompt('Project name', path.basename(cwd));
  const version = await prompt('Version', '1.0.0');
  const description = await prompt('Description', '');
  const type        = await prompt('Project type (executable/library)', 'executable');
  const sourceFiles = await prompt('Source files (A; B)', 'main.cxx');
  const cxxStandard = await prompt('C++ standard (11/14/17/20)', '17');
  const generator   = await prompt('CMake generator (Ninja/Makefiles/VS)', '');
  const testCommand = await prompt('Test command', 'echo "No tests defined"');
  const gitRepo     = await prompt('Git repository URL', gitRepoUrl());
  const keywords    = await prompt('Keywords (A; B)', '');
  const author      = await prompt('Author', gitRecentAuthorEmail());
  const license     = await prompt('License', 'MIT');
  console.log();
  // Create package.json
  const pkg = {}, p = pkg;
  p.name    = name;
  p.version = version;
  p.description = description;
  p.type = type === 'executable'? 'executable' : 'library';
  p.sourceFiles = sourceFiles.split(';').map(s => s.trim()).filter(s => s);
  if (testCommand) p.scripts = {test: testCommand};
  if (gitRepo) {
    p.homepage = `${gitRepo}#readme`;
    p.bugs = {url: `${gitRepo}/issues`};
    p.repository = {
      type: 'git',
      url: gitRepo
    };
  }
  p.keywords = keywords.split(';').map(s => s.trim()).filter(s => s);
  if (author)  p.author  = author;
  if (license) p.license = license;
  p.dependencies = {};
  p.devDependencies = {};
  p.systemDependencies = {
    linux: [],
    darwin: [],
    win32: []
  };
  p.cmake = {};
  p.cmake.minVersion = '3.15';
  if (generator) p.cmake.generator = generator;
  p.cmake.options = {
    CMAKE_CXX_STANDARD: cxxStandard,
    BUILD_SHARED_LIBS: 'OFF'
  }
  // Default target same as name.
  p.targets = [name];
  writeJSONFileSync(pth, pkg);
  initCMakeLists(cwd, pkg);
  initGitignore(cwd);
  initNpmignore(cwd);
  initSourceFiles(cwd, pkg);
  console.log('🍳 Project initialized!\n');
}
//#endregion




//#region PARSE ARG
// Parse a single command-line argument.
function parseArg(opt, argv, k, i) {
  if (k==='--help') opt.help = true;
  else if (k==='--version') opt.version  = true;
  // Parse command name.
  else if (!opt.command) switch (k.toLowerCase()) {
    case 'i':        opt.command = 'includes'; break;
    case 'includes': opt.command = 'includes'; break;
    case 'init':     opt.command = 'init'; break;
    default: opt.error = `Unknown command: ${k}`; break;
  }
  // Parse command options.
  else switch (opt.command) {
    // Parse options for `includes` command.
    case 'includes':
      if (k==='--compiler')   opt.compiler = argv[++i];
      else if (k==='--msvc')  opt.compiler = 'msvc';
      else if (k==='--gcc')   opt.compiler = 'gcc';
      else if (k==='--clang') opt.compiler = 'clang';
      else opt.error = `Unknown option: ${k}`;
      break;
    // Parse options for `init` command.
    case 'init':
      break;
  }
  return i;
}

// Parse command-line arguments.
function parseArgs(argv) {
  const opt = {
    error: null,
    help: false,
    version: false,
    command: '',
    compiler: 'gcc'
  };
  for (let i=2; i<argv.length; i++)
    i = parseArg(opt, argv, argv[i], i);
  return opt;
}
//#endregion




//#region MAIN
// Main entry point.
function main(argv) {
  const opt = parseArgs(argv);
  if (opt.error) {
    console.error(opt.error + '\n');
    console.error('Use "cpoach --help" for usage information.');
    process.exit(1);
  }
  if (opt.help) {
    runHelp();
    process.exit(0);
  }
  if (opt.version) {
    runVersion();
    process.exit(0);
  }
  switch (opt.command) {
    case 'includes': runIncludes(opt); break;
    case 'init':     runInit(opt); break;
  }
}

// Run the main entry point.
main(process.argv);
//#endregion
