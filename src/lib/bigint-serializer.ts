// Custom BigInt serialization for JSON.stringify
// This extends the native JSON.stringify to handle BigInt values

export function setupBigIntSerialization() {
  // Save the original method
  const originalStringify = JSON.stringify;
  
  // Override JSON.stringify to handle BigInt
  (JSON as any).stringify = function(value: any, replacer?: (key: string, value: any) => any, space?: string | number) {
    // Custom replacer that converts BigInt to string with appropriate notation
    const bigintReplacer = (key: string, value: any) => {
      // Check if the value is a BigInt
      if (typeof value === 'bigint') {
        // Convert BigInt to string
        return value.toString();
      }
      
      // Use the original replacer if provided (só chamar se for função; pode ser array)
      return typeof replacer === 'function' ? replacer(key, value) : value;
    };
    
    // Call the original stringify with our custom replacer
    return originalStringify(value, bigintReplacer, space);
  };
}