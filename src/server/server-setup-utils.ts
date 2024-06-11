import { ViteDevServer, createServer, build as viteBuild } from 'vite';
import * as path from 'path';
import { readFile, watch } from 'fs/promises';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { AnyRouter, inferRouterContext } from '@trpc/server';

/**
 * Listens for changes to an HTML file and updates the rendered page
 */
class VitePageRenderer {
    private renderedPage: string = "Please wait for the page to be rendered, then refresh";
    private htmlPath: string;

    constructor(private vite: ViteDevServer, filePath: string) {
        this.htmlPath = path.join(vite.config.root, filePath);
        this.update();
        this.watch();
    }

    private async watch() {
        for await (const fileChange of watch(this.htmlPath)) {
            this.update();
        }
    }

    private async update() {
        const template = await readFile(this.htmlPath, 'utf-8');
        this.renderedPage = await this.vite.transformIndexHtml('/', template);
    }

    getRenderedPage(): string {
        return this.renderedPage;
    }
}

/** Specifies all static routes */
export type StaticPagesConfig = {
    staticPages: {
        route: string,
        file: string
    }[],
    srcDir: string,
    buildDir: string
}

/** Factory function for servers */
export async function createHybridServer(
    config: StaticPagesConfig,
    mode: 'dev' | 'production'
): Promise<IHybridServer> {

    // get the correct function to register static pages based on the mode
    const registerStaticPages: RegisterStaticPagesFunction = mode === 'dev'
        ? registerStaticPagesDev
        : registerStaticPagesProduction;

    const app = express();
    await registerStaticPages(app, config);
    return new HybridServer(app);

}

/**
 * Build static pages using Vite
 */
export function build(config: StaticPagesConfig) {
    return viteBuild({
        root: config.srcDir,
        build: {
            outDir: path.resolve(config.buildDir),
            emptyOutDir: true,
            rollupOptions: {
                input: config.staticPages.reduce<Record<string, string>>((acc, { file }) => {
                    acc[file] = path.join(config.srcDir, file);
                    return acc;
                }, {})
            }
        },
        appType: 'custom',
    });
}

/**
 * A server that can serve both static files and API endpoints
 */
export interface IHybridServer {
    listen(port: number): void;
    useTRPCRouter<TRouter extends AnyRouter>(
        router: TRouter,
        context: inferRouterContext<TRouter>,
    ): void;
}


interface RegisterStaticPagesFunction {
    (app: express.Application, config: StaticPagesConfig): Promise<void>;
}

const registerStaticPagesDev: RegisterStaticPagesFunction = async (app, config) => {
    const vite = await createServer({
        server: {
            middlewareMode: true
        },
        configFile: false,
        appType: 'custom',
        root: config.srcDir,
        plugins: []
    });
    app.use(vite.middlewares);

    for (const { route, file } of config.staticPages) {
        let renderer = new VitePageRenderer(vite, file);
        app.get(route, async (req, res) => {
            res.status(200)
                .set({ 'Content-Type': 'text/html' })
                .end(renderer.getRenderedPage());
        });
    }
}

const registerStaticPagesProduction: RegisterStaticPagesFunction = async (app, config) => {
    for (const { route, file } of config.staticPages) {
        const filePath = path.resolve(path.join(config.buildDir, file));
        app.get(route, async (req, res) => {
            res.sendFile(filePath);
        });
    }
    app.use(express.static(config.buildDir));
}

class HybridServer implements IHybridServer {
    constructor(private app: express.Application) { }

    listen(port: number) {
        this.app.listen(port);
    }

    useTRPCRouter<TRouter extends AnyRouter>(
        router: TRouter,
        context: inferRouterContext<TRouter>,
    ) {
        this.app.use(
            '/trpc',
            trpcExpress.createExpressMiddleware({
                router,
                createContext: () => context
            })
        )
    }

}
