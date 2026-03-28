/**
 * JACK DEPENDENCY RESOLVER (v2.1.0)
 * Performs topological sort on plugin dependencies to resolve load order.
 */

/**
 * Resolves the loading order for a set of plugins based on their dependencies.
 * @param {Array} plugins - List of plugin objects { id, dependencies: [] }
 * @returns {Array} - Ordered list of plugin IDs
 */
function resolveLoadOrder(plugins) {
    const adjList = new Map();
    const indegree = new Map();
    const idToPlugin = new Map();

    // 1. Initialize maps
    plugins.forEach(p => {
        adjList.set(p.id, []);
        indegree.set(p.id, 0);
        idToPlugin.set(p.id, p);
    });

    // 2. Build adjacency list and calculate indegrees
    plugins.forEach(p => {
        const deps = p.dependencies || [];
        deps.forEach(depId => {
            // Only add dependency if the required plugin exists
            if (adjList.has(depId)) {
                adjList.get(depId).push(p.id);
                indegree.set(p.id, indegree.get(p.id) + 1);
            }
        });
    });

    // 3. Queue for nodes with 0 indegree
    const queue = [];
    indegree.forEach((count, id) => {
        if (count === 0) queue.push(id);
    });

    const result = [];
    while (queue.length > 0) {
        const u = queue.shift();
        result.push(u);

        const neighbors = adjList.get(u) || [];
        neighbors.forEach(v => {
            indegree.set(v, indegree.get(v) - 1);
            if (indegree.get(v) === 0) queue.push(v);
        });
    }

    // 4. Circular Dependency Check
    if (result.length !== plugins.length) {
        const failedIds = plugins.map(p => p.id).filter(id => !result.includes(id));
        throw new Error(`Circular dependency detected or missing dependency in plugins: ${failedIds.join(', ')}`);
    }

    return result;
}

module.exports = {
    resolveLoadOrder
};
