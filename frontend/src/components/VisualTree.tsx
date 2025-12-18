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

const NODE_WIDTH = 160;
const NODE_HEIGHT = 36;

const getFolderColor = (path: string) => {
    const name = path.split('/').pop()?.toLowerCase() || '';
    const wellKnown: Record<string, string> = {
        'bin': '#22c55e', 'etc': '#ef4444', 'home': '#3b82f6',
        'usr': '#a855f7', 'var': '#f59e0b', 'root': '#ec4899',
        'dev': '#06b6d4', 'boot': '#84cc16', 'sys': '#6366f1', 'proc': '#94a3b8'
    };
    if (wellKnown[name]) return wellKnown[name];
    let hash = 0;
    for (let i = 0; i < path.length; i++) hash = path.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#38bdf8', '#fbbf24', '#f87171', '#c084fc', '#4ade80', '#fb7185'];
    return colors[Math.abs(hash) % colors.length];
};

const FolderNode = ({ data }: NodeProps) => {
    const color = getFolderColor(data.fullPath as string);
    const isExpanded = data.isExpanded as boolean;
    const onExpand = data.onExpand as (id: string, path: string) => void;

    return (
        <div className="folder-node" onContextMenu={(e) => (data.onContextMenu as Function)(e, data)} style={{ borderColor: color, position: 'relative' }}>
            <Handle type="target" position={Position.Top} style={{ background: color }} />
            <div className="folder-node-content" style={{ paddingRight: '24px' }}>
                <Folder size={14} style={{ color }} />
                <span className="folder-name" title={data.fullPath as string}>{data.label as string}</span>
            </div>

            {/* Expand/Collapse Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onExpand(data.id as string, data.fullPath as string); }}
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
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 80 });
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
        edges
    };
};

const VisualTreeInner: React.FC<{ data: FileNode }> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView } = useReactFlow();
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleContextMenu = useCallback((event: React.MouseEvent, nodeData: any) => {
        event.preventDefault();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(`linux directory ${nodeData.fullPath}`)}`, '_blank');
    }, []);

    const handleExpand = useCallback(async (id: string, path: string) => {
        // Check if children already exist in edges
        const hasChildren = edges.some(e => e.source === id);

        if (hasChildren) {
            // Toggle visibility of children recursively
            const toggleSubtree = (parentId: string, visible: boolean) => {
                const childIds = edges.filter(e => e.source === parentId).map(e => e.target);
                setNodes(nds => nds.map(n => childIds.includes(n.id) ? { ...n, hidden: !visible } : n));
                setEdges(eds => eds.map(e => childIds.includes(e.target) && e.source === parentId ? { ...e, hidden: !visible } : e));
                if (!visible) childIds.forEach(cid => toggleSubtree(cid, false));
            };

            setNodes(nds => nds.map(n => {
                if (n.id === id) {
                    const nextState = !n.data.isExpanded;
                    toggleSubtree(id, nextState);
                    return { ...n, data: { ...n.data, isExpanded: nextState } };
                }
                return n;
            }));
            return;
        }

        // Fetch children from API
        try {
            const newNode = await scanNode(path);
            if (newNode && newNode.children) {
                setNodes(nds => {
                    const updatedNds = nds.map(n => n.id === id ? { ...n, data: { ...n.data, isExpanded: true } } : n);
                    const newNodes: Node[] = newNode.children!.map(child => ({
                        id: child.path,
                        type: 'folder',
                        position: { x: 0, y: 0 },
                        data: { id: child.path, label: child.name, fullPath: child.path, isExpanded: false, onExpand: handleExpand, onContextMenu: handleContextMenu }
                    }));
                    return [...updatedNds, ...newNodes];
                });
                setEdges(eds => {
                    const newEdges: Edge[] = newNode.children!.map(child => ({
                        id: `${id}-${child.path}`,
                        source: id,
                        target: child.path,
                        type: 'smoothstep',
                        animated: true
                    }));
                    return [...eds, ...newEdges];
                });
            }
        } catch (err) {
            console.error("Expand failed", err);
        }
    }, [edges, handleContextMenu, setEdges, setNodes]);

    useEffect(() => {
        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];
        const flattenTree = (node: FileNode, parentId: string | null = null, depth: number = 0) => {
            const id = node.path;
            initialNodes.push({
                id, type: 'folder',
                data: { id, label: node.name || '/', fullPath: node.path, depth, isExpanded: node.children && node.children.length > 0, onExpand: handleExpand, onContextMenu: handleContextMenu },
                position: { x: 0, y: 0 }
            });
            if (parentId) {
                initialEdges.push({ id: `${parentId}-${id}`, source: parentId, target: id, type: 'smoothstep', animated: true });
            }
            node.children?.forEach(child => flattenTree(child, id, depth + 1));
        };
        flattenTree(data);
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(initialNodes, initialEdges);
        setNodes(lNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ nodes: [{ id: data.path }], duration: 800, padding: 2 }), 100);
    }, [data, handleExpand, handleContextMenu, fitView, setNodes, setEdges]);

    // Subtree dragging logic
    const onNodeDragStart = (_: any, node: Node) => { dragStartPos.current = { ...node.position }; };
    const onNodeDrag = (_: any, node: Node) => {
        if (!dragStartPos.current) return;
        const dx = node.position.x - dragStartPos.current.x;
        const dy = node.position.y - dragStartPos.current.y;
        dragStartPos.current = { ...node.position };
        const findDescendants = (parentId: string): string[] => {
            const children = edges.filter(e => e.source === parentId).map(e => e.target);
            return children.reduce((acc, child) => [...acc, child, ...findDescendants(child)], [] as string[]);
        };
        const descendants = findDescendants(node.id);
        if (descendants.length > 0) {
            setNodes(nds => nds.map(n => descendants.includes(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
        }
    };

    // Run layout when nodes/edges change (for expansion)
    const applyLayout = useCallback(() => {
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(nodes, edges);
        setNodes(lNodes);
        setEdges(lEdges);
    }, [nodes, edges, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <button
                onClick={applyLayout}
                style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
                Re-align Layout
            </button>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} onNodeDragStart={onNodeDragStart} onNodeDrag={onNodeDrag} fitView snapToGrid snapGrid={[15, 15]}>
                <Background color="#333" gap={20} /><Controls /><MiniMap nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
        </div>
    );
};

export const VisualTree: React.FC<{ data: FileNode }> = (props) => (
    <ReactFlowProvider><VisualTreeInner {...props} /></ReactFlowProvider>
);
