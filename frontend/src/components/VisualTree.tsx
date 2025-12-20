import React, { useEffect, useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Position,
    Handle,
    ReactFlowProvider,
    useReactFlow
} from '@xyflow/react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { scanNode } from '../api';
import type { FileNode } from '../api';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 50;
const NODE_SPACING_X = 260; // Increased for wider nodes
const NODE_SPACING_Y = 60;  // Sibling distance

const getFolderColor = (path: string, depth: number) => {
    // Base hues for each level
    const levelHues: Record<number, number> = {
        0: 200, // Depth 0: Blue
        1: 140, // Depth 1: Green
        2: 45,  // Depth 2: Amber/Yellow
        3: 280, // Depth 3+: Purple/Magenta
    };

    const hue = levelHues[Math.min(depth, 3)];

    // Hash path for sibling variation (Saturation and Lightness jitter)
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = path.charCodeAt(i) + ((hash << 5) - hash);
    }
    const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
    const lightness = 50 + (Math.abs(hash) % 15);   // 50-65%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const FolderNode = ({ data }: NodeProps) => {
    const color = getFolderColor(String(data.fullPath), Number(data.depth) || 0);
    const isExpanded = data.isExpanded as boolean;
    const isSelected = data.isSelected as boolean;
    const onExpand = data.onExpand as (id: string, path: string) => void;
    const onSelect = data.onSelect as (path: string) => void;

    // Check if it's likely a folder or file (we don't strictly know if leaf is file or empty folder, but assume generic)
    // Actually we can pass hasChildren flag if we knew. For now, use Folder icon.

    const hasContent = Boolean(
        (data.children && Array.isArray(data.children) && data.children.length > 0) ||
        data.has_children
    );

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasContent) {
            onExpand(data.id as string, String(data.fullPath));
        }
    };

    const handleNodeClick = () => {
        // e.stopPropagation(); 
        if (onSelect) onSelect(String(data.fullPath));
    };

    return (
        <div
            className="rect-node"
            onContextMenu={(e) => (data.onContextMenu as Function)(e, data)}
            onClick={handleNodeClick}
            style={{
                position: 'relative',
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                background: 'var(--card-bg)',
                borderLeft: `4px solid ${color}`,
                border: isSelected ? `2px solid ${color}` : `1px solid var(--border-color)`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                gap: '8px',
                boxShadow: isSelected ? `0 0 15px ${color}66` : '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

            {/* Expand Toggle */}
            <div
                onClick={handleExpandClick}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '4px',
                    cursor: hasContent ? 'pointer' : 'default',
                    color: 'var(--text-secondary)',
                    opacity: hasContent ? 1 : 0
                }}
            >
                {hasContent && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </div>

            {/* Icon */}
            <Folder size={18} fill={color} stroke={color} fillOpacity={0.2} />

            {/* Label */}
            <div style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--text-primary)'
            }} title={String(data.label)}>
                {String(data.label)}
            </div>

            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // LR Spacing: ranksep is horizontal level distance, nodesep is vertical sibling distance
    dagreGraph.setGraph({
        rankdir: 'LR',
        nodesep: NODE_SPACING_Y,
        ranksep: NODE_SPACING_X
    });

    // 1. Detect dense parents and prepare sequencing
    const childrenByParent: Record<string, string[]> = {};
    edges.filter(e => !e.hidden).forEach(e => {
        if (!childrenByParent[e.source]) childrenByParent[e.source] = [];
        childrenByParent[e.source].push(e.target);
    });

    // 2. Add nodes to Dagre
    nodes.filter(n => !n.hidden).forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // 3. Add edges to Dagre (Real and Sequencing)
    edges.filter(e => !e.hidden).forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Space Optimization: Multi-Column Grid stacking for folders with >= 5 children
    const DENSE_THRESHOLD = 5;
    const MAX_NODES_PER_COLUMN = 10;

    Object.entries(childrenByParent).forEach(([parentId, children]) => {
        if (children.length >= DENSE_THRESHOLD) {
            console.log(`[Layout] Dense parent detected: ${parentId} (${children.length} children). Applying multi-column grid.`);

            const sortedChildren = [...children].sort((a, b) => {
                const nodeA = nodes.find(n => n.id === a);
                const nodeB = nodes.find(n => n.id === b);
                return String(nodeA?.data?.label || '').localeCompare(String(nodeB?.data?.label || ''));
            });

            // Split into columns
            const columns: string[][] = [];
            for (let i = 0; i < sortedChildren.length; i += MAX_NODES_PER_COLUMN) {
                columns.push(sortedChildren.slice(i, i + MAX_NODES_PER_COLUMN));
            }

            // In LR mode, siblings naturally stack VERTICALLY.
            // To create multiple columns, we need to push subsequent columns to the RIGHT.
            // We do this by adding edges from the first node of Col[i] to the first node of Col[i+1].
            for (let i = 0; i < columns.length - 1; i++) {
                const currentColFirst = columns[i][0];
                const nextColFirst = columns[i + 1][0];
                // Force horizontal separation between columns
                dagreGraph.setEdge(currentColFirst, nextColFirst, { weight: 50, minlen: 1 });
            }
        }
    });

    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            if (node.hidden) return node;
            const { x, y } = dagreGraph.node(node.id);
            if (x === undefined || y === undefined) return node;
            return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
        }),
        edges: edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const parentColor = sourceNode ? getFolderColor(String(sourceNode.data.fullPath), Number(sourceNode.data.depth)) : 'rgba(255,255,255,0.2)';
            return {
                ...edge,
                type: 'default', // Bezier curves
                style: { stroke: parentColor, strokeWidth: 1.5, opacity: 0.4 },
            };
        })
    };
};

const nodeTypes = { folder: FolderNode };

const VisualTreeInner: React.FC<{
    data: FileNode,
    selectedPath: string | null,
    onSelect: (path: string) => void,
    onContextMenu?: (x: number, y: number, path: string) => void
}> = ({ data, selectedPath, onSelect, onContextMenu }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView, getEdges, getNodes } = useReactFlow();
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleContextMenu = useCallback((event: React.MouseEvent, nodeData: any) => {
        event.preventDefault();
        event.stopPropagation();
        if (onContextMenu) {
            onContextMenu(event.clientX, event.clientY, String(nodeData.fullPath));
        }
    }, [onContextMenu]);

    // Persistence helpers
    const getPersistedPos = useCallback((id: string) => {
        try {
            const positions = JSON.parse(localStorage.getItem('nuxview-positions') || '{}');
            return positions[id] as { x: number, y: number } | undefined;
        } catch { return undefined; }
    }, []);

    const savePositions = useCallback((nodes: Node[]) => {
        try {
            const positions = JSON.parse(localStorage.getItem('nuxview-positions') || '{}');
            nodes.forEach(n => {
                positions[n.id] = n.position;
            });
            localStorage.setItem('nuxview-positions', JSON.stringify(positions));
        } catch { /* ignore */ }
    }, []);

    const handleExpand = useCallback(async (id: string, path: string, skipLayout = false) => {
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        const node = currentNodes.find(n => n.id === id);
        if (!node) return;

        const depth = node.data.depth || 0;
        const nextState = !node.data.isExpanded;
        const hasChildrenInTree = currentEdges.some(e => e.source === id);

        let updatedNodes: Node[] = [];
        let updatedEdges: Edge[] = [];

        if (hasChildrenInTree) {
            updatedNodes = currentNodes.map(n => {
                const isTargetNode = n.id === id;
                if (isTargetNode) return { ...n, data: { ...n.data, isExpanded: nextState } };

                // Toggle visibility for all descendants
                const isDescendant = (parentId: string, childId: string, eds: Edge[]): boolean => {
                    const directChild = eds.some(e => e.source === parentId && e.target === childId);
                    if (directChild) return true;
                    // Recursively check parents
                    const parentsOfChild = eds.filter(e => e.target === childId).map(e => e.source);
                    return parentsOfChild.some(p => isDescendant(parentId, p, eds));
                };

                if (isDescendant(id, n.id, currentEdges)) {
                    return { ...n, hidden: !nextState };
                }
                return n;
            });

            updatedEdges = currentEdges.map(e => {
                const isDownstream = (sourceId: string, edge: Edge, allEdges: Edge[]): boolean => {
                    if (edge.source === sourceId) return true;
                    const parents = allEdges.filter(ae => ae.target === edge.source).map(ae => ae.source);
                    return parents.some(p => isDownstream(sourceId, { source: p } as Edge, allEdges));
                };
                return isDownstream(id, e, currentEdges) ? { ...e, hidden: !nextState } : e;
            });
        } else {
            try {
                const newNode = await scanNode(path);
                if (newNode && newNode.children && newNode.children.length > 0) {
                    const childNodes: Node[] = newNode.children.map((child) => ({
                        id: child.path,
                        type: 'folder',
                        position: { x: node.position.x, y: node.position.y + NODE_SPACING_Y },
                        data: {
                            id: child.path, label: child.name, fullPath: child.path,
                            depth: (Number(depth) || 0) + 1, isExpanded: false,
                            onExpand: handleExpand, onContextMenu: handleContextMenu,
                            onSelect, isSelected: child.path === selectedPath,
                            has_children: child.has_children
                        }
                    }));

                    const newEdges: Edge[] = childNodes.map(child => ({
                        id: `${id}-${child.id}`, source: id, target: child.id,
                        type: 'default', animated: false,
                        style: { stroke: getFolderColor(String(node.data.fullPath), Number(node.data.depth)), strokeWidth: 1.5, opacity: 0.4 }
                    }));

                    const baseNodes = currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, isExpanded: true } } : n);
                    updatedNodes = [...baseNodes, ...childNodes];
                    updatedEdges = [...currentEdges, ...newEdges];
                } else {
                    updatedNodes = currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, isExpanded: true } } : n);
                    updatedEdges = currentEdges;
                }
            } catch (err) {
                console.error("Expand failed", err);
                return;
            }
        }

        if (!skipLayout) {
            const { nodes: lNodes, edges: lEdges } = getLayoutedElements(updatedNodes, updatedEdges);

            // "Sticky Anchor" Correction:
            // Find the node we just interacted with in the new layout
            const layoutedInteractedNode = lNodes.find(n => n.id === id);
            if (layoutedInteractedNode) {
                const dx = node.position.x - layoutedInteractedNode.position.x;
                const dy = node.position.y - layoutedInteractedNode.position.y;

                // Shift the entire graph so the clicked node remains stationary
                const anchoredNodes = lNodes.map(n => ({
                    ...n,
                    position: { x: n.position.x + dx, y: n.position.y + dy }
                }));

                setNodes(anchoredNodes);
                setEdges(lEdges);
                savePositions(anchoredNodes);
            } else {
                setNodes(lNodes);
                setEdges(lEdges);
                savePositions(lNodes);
            }
        } else {
            setNodes(updatedNodes);
            setEdges(updatedEdges);
        }
    }, [getEdges, getNodes, handleContextMenu, setEdges, setNodes, savePositions]);

    // Batch processing helper
    const fetchChildrenRecursive = async (node: Node, allNodes: Node[], allEdges: Edge[], depthLimit: number) => {
        if (depthLimit <= 0) return;

        try {
            // Simulate "check if we need to fetch". Real implementation calls API.
            // We only fetch if not already expanded or fetching deeply.
            // For simplicity in this demo, we assume scanNode is fast or cached.
            const newNode = await scanNode(String(node.data.fullPath));
            if (newNode && newNode.children && newNode.children.length > 0) {
                const childNodes: Node[] = newNode.children.map((child: any) => ({
                    id: child.path,
                    type: 'folder',
                    position: { x: 0, y: 0 }, // Position set by layout later
                    data: {
                        id: child.path, label: child.name, fullPath: child.path,
                        depth: (Number(node.data.depth) || 0) + 1, isExpanded: false,
                        onExpand: handleExpand, onContextMenu: handleContextMenu,
                        onSelect, isSelected: child.path === selectedPath
                    }
                }));

                const newEdges: Edge[] = childNodes.map(child => ({
                    id: `${node.id}-${child.id}`, source: node.id, target: child.id,
                    type: 'default', animated: false,
                    style: { stroke: getFolderColor(String(node.data.fullPath), Number(node.data.depth)), strokeWidth: 1.5, opacity: 0.4 }
                }));

                // Add to collections if not exists
                childNodes.forEach(child => {
                    if (!allNodes.find(n => n.id === child.id)) {
                        allNodes.push(child);
                        // Recursively fetch children
                        // We push to a promise array to do parallel? For now sequential to avoid rate limits/complexity
                        // Actually, pushing to a queue would be better, but strict recursion is clearer for now.
                    }
                });
                newEdges.forEach(edge => {
                    if (!allEdges.find(e => e.id === edge.id)) allEdges.push(edge);
                });

                // Mark parent as expanded
                const parentIdx = allNodes.findIndex(n => n.id === node.id);
                if (parentIdx !== -1) {
                    allNodes[parentIdx] = { ...allNodes[parentIdx], data: { ...allNodes[parentIdx].data, isExpanded: true } };
                }

                // Recurse for children
                for (const child of childNodes) {
                    // We don't await here to let them run in parallel? 
                    // No, let's await to ensure order and avoid overwhelming.
                    await fetchChildrenRecursive(child, allNodes, allEdges, depthLimit - 1);
                }
            }
        } catch (e) { console.error(e); }
    };

    const expandAll = useCallback(async () => {
        const currentNodes = getNodes();
        const rootNode = currentNodes.find(n => n.data.depth === 0);
        if (!rootNode) return;

        const initialRootPos = { ...rootNode.position };

        // Clone current state to start with
        let allNodes = [...getNodes()];
        let allEdges = [...getEdges()];

        // Start BFS fetch from visible nodes that need expansion
        // For "Expand All", we typically mean "Expand everything currently in the tree" or "Everything from root".
        // Let's assume everything from Root down to X levels.
        const START_DEPTH_LIMIT = 3; // Safety: only expand 3 levels deeper than current

        // Mark all current visible nodes as expand targets?
        // Let's just start from Root and ensure everything is loaded up to depth limit.
        await fetchChildrenRecursive(rootNode, allNodes, allEdges, START_DEPTH_LIMIT);

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(allNodes, allEdges);

        // Global Anchor to Root
        const layoutedRootNode = lNodes.find(n => n.data.depth === 0);
        if (layoutedRootNode) {
            const dx = initialRootPos.x - layoutedRootNode.position.x;
            const dy = initialRootPos.y - layoutedRootNode.position.y;
            const anchoredNodes = lNodes.map(n => ({
                ...n,
                position: { x: n.position.x + dx, y: n.position.y + dy }
            }));
            setNodes(anchoredNodes);
        } else {
            setNodes(lNodes);
        }
        setEdges(lEdges);
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [getNodes, getEdges, setNodes, setEdges, fitView, handleExpand, handleContextMenu]);

    const collapseAll = useCallback(() => {
        setNodes(nds => nds.map(n => {
            const isRoot = n.data.depth === 0;
            return { ...n, hidden: !isRoot, data: { ...n.data, isExpanded: isRoot } };
        }));
        setEdges(eds => eds.map(e => ({ ...e, hidden: true })));
    }, [setNodes, setEdges]);

    const resetPositions = useCallback(() => {
        localStorage.removeItem('nuxview-positions');
        // Trigger a fresh layout
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(nodes, edges);
        setNodes(lNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [nodes, edges, setNodes, setEdges, fitView]);

    const lastPath = useRef<string | null>(null);

    const ensurePathVisible = useCallback(async (targetPath: string) => {
        // Ensure strictly inside root
        if (!targetPath.startsWith(data.path)) return;

        let currentPath = data.path;
        // Verify root expansion first
        let rootNode = getNodes().find(n => n.id === currentPath);
        if (rootNode && !rootNode.data.isExpanded) {
            await handleExpand(currentPath, currentPath);
            await new Promise(r => setTimeout(r, 300)); // Layout wait
        }

        const relative = targetPath.slice(data.path.length).replace(/^[/\\]/, '');
        if (!relative) return;

        const parts = relative.split(/[/\\]/);

        // Iterate segments to expand parents
        for (let i = 0; i < parts.length - 1; i++) {
            const sep = data.path.includes('\\') ? '\\' : '/';
            currentPath = `${currentPath.replace(/[/\\]$/, '')}${sep}${parts[i]}`;

            // Retry logic for node appearance
            let node = getNodes().find(n => n.id === currentPath);
            if (!node) {
                // Wait a bit if node not found (previous expansion might still be processing/animating)
                for (let attempt = 0; attempt < 3; attempt++) {
                    await new Promise(r => setTimeout(r, 200));
                    node = getNodes().find(n => n.id === currentPath);
                    if (node) break;
                }
            }

            if (node && !node.data.isExpanded) {
                await handleExpand(node.id, node.data.fullPath as string);
                await new Promise(r => setTimeout(r, 300));
            }
        }
    }, [data.path, getNodes, handleExpand]);

    useEffect(() => {
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, isSelected: n.data.fullPath === selectedPath, onSelect }
        })));

        const syncSelection = async () => {
            if (selectedPath) {
                await ensurePathVisible(selectedPath);

                // Use getNodes to avoid dependency loop and get fresh state
                const currentNodes = getNodes();
                const targetNode = currentNodes.find(n => n.data.fullPath === selectedPath);
                if (targetNode) {
                    fitView({ nodes: [targetNode], duration: 800, padding: 0.2 });
                }
            }
        };
        syncSelection();
    }, [selectedPath, setNodes, getNodes, fitView, onSelect, ensurePathVisible]);

    useEffect(() => {
        if (data.path === lastPath.current) return;
        lastPath.current = data.path;

        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        // Flatten Level 0 (Root) ONLY
        const rootId = data.path;
        initialNodes.push({
            id: rootId, type: 'folder',
            data: {
                id: rootId, label: data.name || '/', fullPath: data.path,
                depth: 0, isExpanded: false,
                onExpand: handleExpand, onContextMenu: handleContextMenu,
                onSelect,
                has_children: data.has_children
            },
            position: { x: 0, y: 0 }
        });

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(initialNodes, initialEdges);

        // Apply persisted positions
        const persistedNodes = lNodes.map(n => {
            const pos = getPersistedPos(n.id);
            return pos ? { ...n, position: pos } : n;
        });

        setNodes(persistedNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 100);
    }, [data.path, data.name, handleExpand, handleContextMenu, fitView, setNodes, setEdges, getPersistedPos, onSelect]);

    const applyLayout = useCallback(() => {
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(nodes, edges);
        setNodes(lNodes);
        setEdges(lEdges);
        savePositions(lNodes);
    }, [nodes, edges, setNodes, setEdges, savePositions]);

    // Subtree dragging logic
    const onNodeDragStart = (_: any, node: Node) => { dragStartPos.current = { ...node.position }; };
    const onNodeDrag = (_: any, node: Node) => {
        if (!dragStartPos.current) return;
        const dx = node.position.x - dragStartPos.current.x;
        const dy = node.position.y - dragStartPos.current.y;
        dragStartPos.current = { ...node.position };
        const findDescendants = (parentId: string): string[] => {
            const edgs = getEdges();
            const children = edgs.filter(e => e.source === parentId).map(e => e.target);
            return children.reduce((acc, child) => [...acc, child, ...findDescendants(child)], [] as string[]);
        };
        const descendants = findDescendants(node.id);
        if (descendants.length > 0) {
            setNodes(nds => {
                const nextNodes = nds.map(n => descendants.includes(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n);
                return nextNodes;
            });
        }
    };

    const onNodeDragStop = (_: any) => {
        savePositions(nodes);
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
                <button
                    onClick={applyLayout}
                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    Re-align Layout
                </button>
                <button
                    onClick={expandAll}
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    Expand All
                </button>
                <button
                    onClick={collapseAll}
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    Collapse All
                </button>
                <button
                    onClick={resetPositions}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    Reset Positions
                </button>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                minZoom={0.1}
                maxZoom={2}
                fitView
                style={{ background: 'var(--bg-color)' }}
            >
                <MiniMap
                    nodeColor={n => {
                        if (n.type === 'folder') return '#4ade80';
                        return '#eee';
                    }}
                    maskColor="rgba(0, 0, 0, 0.2)"
                    style={{ background: 'rgba(29, 35, 42, 0.9)', border: '1px solid #333' }}
                />
                <Controls />
                <Background color="#333" gap={16} />
            </ReactFlow>
        </div>
    );
};

export const VisualTree: React.FC<{
    data: FileNode,
    selectedPath: string | null,
    onSelect: (path: string) => void,
    onContextMenu?: (x: number, y: number, path: string) => void
}> = (props) => (
    <ReactFlowProvider>
        <VisualTreeInner {...props} />
    </ReactFlowProvider>
);
