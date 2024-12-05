import { OpenAPIV3 } from 'openapi-types';
import type { TemplateData, ParameterData, BodyData, ResponseData, ConverterOptions } from './interfaces';

export function buildTemplateData(doc: OpenAPIV3.Document, opts: ConverterOptions): TemplateData {
  const pathsArr = Object.entries(doc.paths || {}).map(([path, pi])=>{
    const piObj = pi || {};
    const methods = (Object.keys(piObj) as OpenAPIV3.HttpMethods[])
      .filter(m=>Object.values(OpenAPIV3.HttpMethods).includes(m))
      .map(method=>{
        const op = (piObj as any)[method] as OpenAPIV3.OperationObject | undefined;
        if(!op) return null;
        const parameters = resolveParameters(op, piObj);
        const requestBody = resolveRequestBody(op);
        const responses = resolveResponses(op);

        return {
          method,
          summary: op.summary,
          description: op.description,
          parameters,
          requestBody,
          responses
        };
      })
      .filter(Boolean) as any[];

    const anchor = path.replace(/[^\w]+/g,'-').toLowerCase();
    return {
      path,
      anchor,
      methods
    };
  });

  return {
    title: doc.info.title,
    description: doc.info.description,
    version: doc.info.version,
    paths: pathsArr,
    toc: opts.toc,
    headingLevel: opts.headingLevel
  };
}

function resolveParameters(op: OpenAPIV3.OperationObject, piObj: OpenAPIV3.PathItemObject): ParameterData[] {
  const combinedParams = [...(piObj.parameters||[]), ...(op.parameters||[])];
  return combinedParams.map(refOrParam => {
    let param: OpenAPIV3.ParameterObject | undefined;
    if ('$ref' in refOrParam) {
      // With dereferencing done, we shouldn't see $refs here. If we do, it's a no-op.
      return null;
    } else {
      param = refOrParam;
    }
    return {
      name: param.name,
      in: param.in,
      required: param.required,
      description: param.description,
      schemaType: 'schema' in param ? (param.schema && 'type' in param.schema ? param.schema.type : undefined) : undefined
    };
  }).filter(Boolean) as ParameterData[];
}

function resolveRequestBody(op: OpenAPIV3.OperationObject): BodyData | undefined {
  if(!op.requestBody) return undefined;
  if('$ref' in op.requestBody) {
    // After dereferencing, this shouldn't happen. If it does, we handle gracefully.
    return { description:'Referenced requestBody', schemaType:'unknown' };
  }
  const rb = op.requestBody;
  if (!rb.content) return undefined;
  const [contentType, media] = Object.entries(rb.content)[0];
  const example = media.example ?? (media.examples ? Object.values(media.examples)[0] : undefined);
  const schemaType = media.schema && 'type' in media.schema ? media.schema.type : undefined;
  return {
    description: rb.description,
    contentType,
    example,
    schemaType
  };
}

function resolveResponses(op: OpenAPIV3.OperationObject): ResponseData[] {
  return Object.entries(op.responses||{}).map(([statusCode, r])=>{
    if('$ref' in r) {
      return {
        statusCode,
        description:'Referenced response'
      };
    }
    const resp = r as OpenAPIV3.ResponseObject;
    const [ct, media] = resp.content ? Object.entries(resp.content)[0] : [undefined, undefined];
    const example = media?.example ?? (media?.examples ? Object.values(media.examples)[0] : undefined);
    const schemaType = media?.schema && 'type' in media.schema ? media.schema.type : undefined;

    return {
      statusCode,
      description: resp.description,
      contentType: ct,
      example,
      schemaType
    };
  });
}