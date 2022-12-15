#!/usr/bin/env node

import RepositoryToolCLI from './RepositoryToolCLI.js';

const cli = new RepositoryToolCLI();
await cli.run();
cli.report();
