import { StaticPagesConfig } from "./src/server/server-setup-utils";

export default {
    'buildDir': 'static/',
    'srcDir': 'src/client/',
    'staticPages': [
        {
            'route': '/',
            'file': 'index.html',
        }
    ]
} as StaticPagesConfig;