import Handlebars from 'handlebars';

export function registerHelpers(hb: typeof Handlebars) {
  hb.registerHelper('renderPath', function(pathObj: any, headingLevel: number) {
    const h = (level: number, text: string) => '#'.repeat(level) + ' ' + text;
    let str = `\n${h(headingLevel, pathObj.path)}\n\n`;
    for (const m of pathObj.methods) {
      str += `\n${h(headingLevel+1, m.method.toUpperCase())}\n\n`;
      if(m.summary) str += `**Summary:** ${m.summary}\n\n`;
      if(m.description) str += `${m.description}\n\n`;

      if(m.parameters && m.parameters.length > 0) {
        str += `**Parameters:**\n\n| Name | In | Required | Type | Description |\n|------|----|----------|------|-------------|\n`;
        for (const param of m.parameters) {
          str += `| ${param.name} | ${param.in} | ${param.required? 'Yes':'No'} | ${param.schemaType||''} | ${param.description||''} |\n`;
        }
        str += `\n`;
      }

      if(m.requestBody) {
        str += `**Request Body:**\n\n`;
        if(m.requestBody.description) str += `_Description:_ ${m.requestBody.description}\n\n`;
        if(m.requestBody.contentType) str += `_Content-Type:_ ${m.requestBody.contentType}\n\n`;
        if(m.requestBody.schemaType) str += `_Schema Type:_ ${m.requestBody.schemaType}\n\n`;
        if(typeof m.requestBody.example !== 'undefined') {
          str += `**Example:**\n\`\`\`json\n${JSON.stringify(m.requestBody.example, null,2)}\n\`\`\`\n\n`;
        }
      }

      if(m.responses && m.responses.length > 0) {
        str += `**Responses:**\n\n`;
        for (const r of m.responses) {
          str += `- **${r.statusCode}:** ${r.description}\n`;
          if(r.contentType) str += `  - Content-Type: ${r.contentType}\n`;
          if(r.schemaType) str += `  - Schema Type: ${r.schemaType}\n`;
          if(typeof r.example !== 'undefined') {
            str += `  - Example:\n\n  \`\`\`json\n${JSON.stringify(r.example,null,2)}\n\`\`\`\n\n`;
          }
        }
        str += `\n`;
      }
    }
    return new hb.SafeString(str);
  });
}