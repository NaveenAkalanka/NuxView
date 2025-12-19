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
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { scanNode } from '../api';
import type { FileNode } from '../api';
import { Folder, Plus, Minus } from 'lucide-react';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 32;

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
    const onExpand = data.onExpand as (id: string, path: string) => void;

    return (
        <div className="folder-node" onContextMenu={(e) => (data.onContextMenu as Function)(e, data)} style={{ borderColor: color, position: 'relative' }}>
            <Handle type="target" position={Position.Top} style={{ background: color }} />
            <div className="folder-node-content" style={{ paddingRight: '24px' }}>
                <Folder size={14} style={{ color }} />
                <span className="folder-name" title={String(data.fullPath)}>{String(data.label)}</span>
            </div>

            {/* Expand/Collapse Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onExpand(data.id as string, String(data.fullPath)); }}
                style={{
                    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2px', color: color, pointerEvents: 'all'
                }}
            >
                {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
            </button>

            <Handle type="source" position={Position.Bottom} style={{ background: color }} />
        </div>
    );
};

const nodeTypes = { folder: FolderNode };

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    // Increased spacing: nodesep (horizontal) and ranksep (vertical)
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });

    nodes.filter(n => !n.hidden).forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    edges.filter(e => !e.hidden).forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            if (node.hidden) return node;
            const { x, y } = dagreGraph.node(node.id);
            return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
        }),
        edges: edges.map(edge => {
            // Color edge to match parent node's level color
            const sourceNode = nodes.find(n => n.id === edge.source);
            const parentColor = sourceNode ? getFolderColor(String(sourceNode.data.fullPath), Number(sourceNode.data.depth)) : 'rgba(255,255,255,0.2)';
            return {
                ...edge,
                style: { stroke: parentColor, strokeWidth: 2, opacity: 0.6 },
            };
        })
    };
};

const VisualTreeInner: React.FC<{ data: FileNode }> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView, getEdges, getNodes } = useReactFlow();
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleContextMenu = useCallback((event: React.MouseEvent, nodeData: any) => {
        event.preventDefault();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(String(nodeData.fullPath))}`, '_blank');
    }, []);

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

    const handleExpand = useCallback(async (id: string, path: string) => {
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        const node = currentNodes.find(n => n.id === id);
        if (!node) return;

        const depth = node.data.depth || 0;
        const hasChildrenInTree = currentEdges.some(e => e.source === id);

        if (hasChildrenInTree) {
            const toggleSubtree = (parentId: string, visible: boolean, eds: Edge[]) => {
                const childIds = eds.filter(e => e.source === parentId).map(e => e.target);
                setNodes(nds => nds.map(n => childIds.includes(n.id) ? { ...n, hidden: !visible } : n));
                setEdges(prevEds => prevEds.map(e => childIds.includes(e.target) && e.source === parentId ? { ...e, hidden: !visible } : e));
                if (!visible) childIds.forEach(cid => toggleSubtree(cid, false, eds));
            };

            const nextState = !node.data.isExpanded;
            setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isExpanded: nextState } } : n));
            toggleSubtree(id, nextState, currentEdges);
            return;
        }

        try {
            const newNode = await scanNode(path);
            if (newNode && newNode.children) {
                const px = node.position.x;
                const py = node.position.y;

                const childNodes: Node[] = newNode.children!.map((child, index) => {
                    const persisted = getPersistedPos(child.path);
                    return {
                        id: child.path,
                        type: 'folder',
                        position: persisted || { x: px + (index - (newNode.children!.length - 1) / 2) * 160, y: py + 100 },
                        data: {
                            id: child.path, label: child.name, fullPath: child.path,
                            depth: (Number(depth) || 0) + 1, isExpanded: false,
                            onExpand: handleExpand, onContextMenu: handleContextMenu
                        }
                    };
                });

                const newEdges: Edge[] = childNodes.map(child => {
                    const parentColor = getFolderColor(String(node.data.fullPath), Number(node.data.depth));
                    return {
                        id: `${id}-${child.id}`, source: id, target: child.id,
                        type: 'smoothstep', animated: true,
                        style: { stroke: parentColor, strokeWidth: 2, opacity: 0.6 }
                    };
                });

                setNodes(nds => {
                    const updatedNds = nds.map(n => n.id === id ? { ...n, data: { ...n.data, isExpanded: true } } : n);
                    return [...updatedNds, ...childNodes];
                });
                setEdges(eds => [...eds, ...newEdges]);
                savePositions(childNodes);
            }
        } catch (err) {
            console.error("Expand failed", err);
        }
    }, [getEdges, getNodes, handleContextMenu, setEdges, setNodes, getPersistedPos, savePositions]);

    const expandAll = useCallback(async () => {
        const folders = getNodes().filter(n => !n.data.isExpanded && !n.hidden);
        for (const f of folders) {
            await handleExpand(f.id, String(f.data.fullPath));
        }
    }, [getNodes, handleExpand]);

    const collapseAll = useCallback(() => {
        setNodes(nds => nds.map(n => {
            const isRoot = n.data.depth === 0;
            return { ...n, hidden: !isRoot, data: { ...n.data, isExpanded: isRoot } };
        }));
        setEdges(eds => eds.map(e => ({ ...e, hidden: true })));
    }, [setNodes, setEdges]);

    const lastPath = useRef<string | null>(null);

    useEffect(() => {
        if (data.path === lastPath.current) return;
        lastPath.current = data.path;

        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        // Flatten Level 0 (Root)
        const rootId = data.path;
        initialNodes.push({
            id: rootId, type: 'folder',
            data: {
                id: rootId, label: data.name || '/', fullPath: data.path,
                depth: 0, isExpanded: data.children ? data.children.length > 0 : false,
                onExpand: handleExpand, onContextMenu: handleContextMenu
            },
            position: { x: 0, y: 0 }
        });

        // Flatten Level 1 (Immediate Children)
        if (data.children) {
            data.children.forEach(child => {
                const childId = child.path;
                initialNodes.push({
                    id: childId, type: 'folder',
                    data: {
                        id: childId, label: child.name, fullPath: child.path,
                        depth: 1, isExpanded: false,
                        onExpand: handleExpand, onContextMenu: handleContextMenu
                    },
                    position: { x: 0, y: 0 }
                });

                const parentColor = getFolderColor(data.path, 0);
                initialEdges.push({
                    id: `${rootId}-${childId}`, source: rootId, target: childId,
                    type: 'smoothstep', animated: true,
                    style: { stroke: parentColor, strokeWidth: 2, opacity: 0.6 }
                });
            });
        }

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(initialNodes, initialEdges);

        // Apply persisted positions
        const persistedNodes = lNodes.map(n => {
            const pos = getPersistedPos(n.id);
            return pos ? { ...n, position: pos } : n;
        });

        setNodes(persistedNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ duration: 400, padding: 2 }), 100);
    }, [data, handleExpand, handleContextMenu, fitView, setNodes, setEdges, getPersistedPos]);

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
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                minZoom={0.01}
                maxZoom={2}
                onlyRenderVisibleElements={true}
            >
                <Background color="#333" gap={20} /><Controls /><MiniMap nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
        </div>
    );
};

export const VisualTree: React.FC<{ data: FileNode }> = (props) => (
    <ReactFlowProvider><VisualTreeInner {...props} /></ReactFlowProvider>
);
