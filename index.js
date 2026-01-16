const fs   = require('fs');
const path = require('path');


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


// Run the help command, which displays usage information.
function runHelp() {
  console.error(
    `Usage: cpoach [command] [options]\n` +
    `\n` +
    `Commands:\n` +
    `  i | includes         Generate compiler flags for include paths.\n` +
    `\n` +
    `Options:\n` +
    `  --compiler [name]    Specify the compiler (msvc, gcc, clang). Default is gcc.\n` +
    `  --msvc               Shortcut for --compiler msvc.\n` +
    `  --gcc                Shortcut for --compiler gcc.\n` +
    `  --clang              Shortcut for --compiler clang.\n`
  );
}


// Parse the command name.
function parseCommand(opt, cmd) {
  if (/i|includes/.test(cmd)) opt.command = 'includes';
  else opt.error = `Unknown option: ${cmd}`;
}

// Parse a single command-line argument.
function parseArg(opt, argv, k, i) {
  if (k==='--help') opt.help = true;
  else if (k==='--compiler') opt.compiler = argv[++i];
  else if (k==='--msvc')  opt.compiler = 'msvc';
  else if (k==='--gcc')   opt.compiler = 'gcc';
  else if (k==='--clang') opt.compiler = 'clang';
  else if (!opt.command)  parseCommand(opt, k);
  else opt.error = `Unknown option: ${k}`;
  return i;
}

// Parse command-line arguments.
function parseArgs(argv) {
  const opt = {
    error: null,
    help: false,
    command: 'includes',
    compiler: 'gcc'
  };
  for (let i=2; i<argv.length; i++)
    i = parseArg(opt, argv, argv[i], i);
  return opt;
}


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
  switch (opt.command) {
    case 'includes': runIncludes(opt); break;
    default:
      console.error(`Unknown command: ${opt.command}`);
      process.exit(1);
  }
}

// Run the main entry point.
main(process.argv);
