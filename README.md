# Metodo

Metodo is a command-line utility that exists to help you track your time.

# Installation

## with npm

```
npm i -g metodo
```

## locally
```bash
# clone the repo
git clone https://github.com/eisenivan/metodo.git

# change directory
cd metodo

# install dependencies
npm i

# locally install it globally
npm link

```

# Usage

```bash
# add a new task (pom)
metodo add

# bring up a list of tasks to start
# select your task and press enter
metodo start

# check the status of all your tasks
metodo list

# get more detailed information about a task
metodo info

# finish a task
# note: when you finish a task metodo will ask
# you to tell you how long it took. If you leave
# this blank, metodo will calculated how long it
# took based on the start and end timestamps
metodo finish

# delete a task
metodo delete

# archive all of your finished tasks to clear out the noise
metodo archive

# get a full list of all commands and shortcuts
metodo --help
```

# Compatibility

*Tested with node >9.8.0*

# License

MIT
