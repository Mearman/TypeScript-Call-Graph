import staticFilesConfig from '../../static-files.config.js';
import { build } from './server-setup-utils.js';

// npm run build invokes this

build(staticFilesConfig);