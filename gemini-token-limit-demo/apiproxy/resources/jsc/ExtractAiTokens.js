try {
    var content = response.content;
    if (content) {
        var body = JSON.parse(content);
        if (body.usageMetadata) {
            context.setVariable("ai.promptTokenCount", body.usageMetadata.promptTokenCount || 0);
            context.setVariable("ai.responseTokenCount", body.usageMetadata.candidatesTokenCount || 0);
            context.setVariable("ai.totalTokenCount", body.usageMetadata.totalTokenCount || 0);
        } else if (body.usage) {
            context.setVariable("ai.promptTokenCount", body.usage.prompt_tokens || body.usage.input_tokens || 0);
            context.setVariable("ai.responseTokenCount", body.usage.completion_tokens || body.usage.output_tokens || 0);
            context.setVariable("ai.totalTokenCount", body.usage.total_tokens || 0);
        }
        if (body.modelVersion) {
            context.setVariable("ai.model", body.modelVersion);
        } else if (body.model) {
            context.setVariable("ai.model", body.model);
        }
    }

    // Extract Department and Sub Department from Developer App custom attributes
    var dept = context.getVariable("verifyapikey.VerifyAPIKey.Department") ||
               context.getVariable("app.Department") ||
               "Unknown";
    var subDept = context.getVariable("verifyapikey.VerifyAPIKey.Sub Department") ||
                  context.getVariable("app.Sub Department") ||
                  "Unknown";

    context.setVariable("ai.department", dept);
    context.setVariable("ai.subDepartment", subDept);
} catch(e) {}
