import { StaticPagesConfig } from "./src/server/server-setup-utils.js";

const config: StaticPagesConfig = {
    'buildDir': 'static/',
    'srcDir': 'src/client/',
    'staticPages': [
        {
            'route': '/',
            'file': 'index.html',
        }
    ],
    hmrPort: 3001
}

export default config;