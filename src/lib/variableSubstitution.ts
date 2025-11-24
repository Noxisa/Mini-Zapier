export function substituteVariables(obj: any, context: any): any {
  if (typeof obj === 'string') {
    return substituteInString(obj, context);
  } else if (Array.isArray(obj)) {
    return obj.map(item => substituteVariables(item, context));
  } else if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteVariables(value, context);
    }
    return result;
  }

  return obj;
}

function substituteInString(str: string, context: any): string {
  // Replace {{variable}} syntax with actual values
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    try {
      const value = getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    } catch (error) {
      console.warn(`Failed to resolve variable: ${path}`, error);
      return match;
    }
  });
}

function getNestedValue(obj: any, path: string): any {
  // Handle nested property access like "trigger.email" or "action_0_result.id"
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array access with index like "action_0_result.items.0"
    if (key.match(/^\d+$/)) {
      const index = parseInt(key);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = current[key];
    }
  }

  return current;
}

// Advanced variable functions for complex transformations
export const variableFunctions = {
  // Format date: {{formatDate(trigger.timestamp, "YYYY-MM-DD")}}
  formatDate: (value: any, format: string) => {
    try {
      const date = new Date(value);
      // Basic date formatting (would use a proper date library in production)
      return date.toISOString().split('T')[0];
    } catch {
      return value;
    }
  },

  // Uppercase: {{upper(trigger.name)}}
  upper: (value: any) => {
    return typeof value === 'string' ? value.toUpperCase() : String(value);
  },

  // Lowercase: {{lower(trigger.name)}}
  lower: (value: any) => {
    return typeof value === 'string' ? value.toLowerCase() : String(value);
  },

  // Default value: {{default(trigger.optional_field, "N/A")}}
  default: (value: any, defaultValue: any) => {
    return value !== undefined && value !== null && value !== '' ? value : defaultValue;
  },

  // Join array: {{join(trigger.tags, ", ")}}
  join: (array: any, separator: string = ', ') => {
    if (Array.isArray(array)) {
      return array.join(separator);
    }
    return String(array || '');
  },

  // Get first item: {{first(trigger.items)}}
  first: (array: any) => {
    if (Array.isArray(array) && array.length > 0) {
      return array[0];
    }
    return array;
  },

  // Get last item: {{last(trigger.items)}}
  last: (array: any) => {
    if (Array.isArray(array) && array.length > 0) {
      return array[array.length - 1];
    }
    return array;
  },

  // Count items: {{count(trigger.items)}}
  count: (array: any) => {
    if (Array.isArray(array)) {
      return array.length;
    }
    return 0;
  },
};