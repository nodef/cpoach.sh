![](https://github.com/user-attachments/assets/459f91c1-c313-4f3a-b4e1-14edc4fb358f)

**cpoach** is a support tool designed to simplify the use of single-file C/C++ libraries. These libraries can be effortlessly installed via `npm`, making it easier to integrate them into your projects without the hassle of *managing build systems* or including third-party libraries in your version control. Refer to the [website](https://nodef.github.io) for the list of available libraries.

<br>

## Features

- Install and use C/C++ libraries as easily as `#include <stdio.h>`.
- Libraries are available via NPM for seamless installation.
- Ideal for in-class demonstrations and assignments.
- Access libraries for high-performance computing, graphics, networking, cryptography, and more.

<br>

## Installation

To install *cpoach*, use the following command:

```bash
npm i -g cpoach.sh
```

<br>

## Usage

After installation, you can include the desired libraries in your C/C++ projects. For example, if you want to use the [tigr.c] library for graphics, follow these steps:

Run:
```bash
$ npm i tigr.c
```

And then include `tigr.h` as follows:
```c
// main.c
#define TIGR_IMPLEMENTATION
#include <tigr.h>

int main() { /* ... */ }
```

And then compile with `clang` or `gcc` as usual.

```bash
$ clang $(cpoach i) main.c  # or, use gcc
$ gcc   $(cpoach i) main.c
```

As mentioned earlier, the catalog of available libraries is available on the [website](https://nodef.github.io).

<br>

## Documentation

```bash
$ cpoach [command] [options]

Usage: cpoach [command] [options]

Commands:
  i | includes         Generate compiler flags for include paths.

Options:
  --compiler [name]    Specify the compiler (msvc, gcc, clang). Default is gcc.
  --msvc               Shortcut for --compiler msvc.
  --gcc                Shortcut for --compiler gcc.
  --clang              Shortcut for --compiler clang.
  --help               Display help information.
```

<br>

## Contributing

We welcome contributions! If you have suggestions, please open an issue on our [GitHub repository](https://github.com/nodef/cpoach.sh/issues).

<br>
<br>


[![ORG](https://img.shields.io/badge/org-nodef-green?logo=Org)](https://nodef.github.io)
![](https://ga-beacon.deno.dev/G-RC63DPBH3P:SH3Eq-NoQ9mwgYeHWxu7cw/github.com/nodef/cpoach.sh)

[tigr.c]: https://www.npmjs.com/package/tigr.c
