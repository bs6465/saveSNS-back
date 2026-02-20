declare module 'swagger-jsdoc' {
  interface SwaggerDefinition {
    openapi?: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    components?: Record<string, unknown>;
    [key: string]: unknown;
  }

  interface Options {
    definition?: SwaggerDefinition;
    swaggerDefinition?: SwaggerDefinition;
    apis: string[];
    [key: string]: unknown;
  }

  function swaggerJSDoc(options: Options): Record<string, unknown>;
  export = swaggerJSDoc;
}
