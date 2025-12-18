import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import type { FileNode } from '../api';
import { Folder } from 'lucide-react';

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

const FolderNode = ({ data, isConnectable }: NodeProps) => {
    const color = getFolderColor(data.fullPath as string);
    return (
        <div className="folder-node" onContextMenu={(e) => (data.onContextMenu as Function)(e, data)} style={{ borderColor: color }}>
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: color }} />
            <div className="folder-node-content">
                <Folder size={14} style={{ color }} />
                <span className="folder-name" title={data.fullPath as string}>{data.label as string}</span>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: color }} />
        </div>
    );
};

const nodeTypes = { folder: FolderNode };

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 80 });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    return {
        nodes: nodes.map((node) => {
            const { x, y } = dagreGraph.node(node.id);
            return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
        }),
        edges
    };
};

const VisualTreeInner: React.FC<{ data: FileNode }> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [visibleDepth, setVisibleDepth] = useState(4);
    const { fitView } = useReactFlow();
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleContextMenu = useCallback((event: React.MouseEvent, nodeData: any) => {
        event.preventDefault();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(`linux directory ${nodeData.fullPath}`)}`, '_blank');
    }, []);

    useEffect(() => {
        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];
        const flattenTree = (node: FileNode, parentId: string | null = null, depth: number = 0) => {
            const id = node.path;
            const isHidden = depth >= visibleDepth;
            initialNodes.push({
                id, type: 'folder', hidden: isHidden,
                data: { label: node.name || '/', fullPath: node.path, depth, onContextMenu: handleContextMenu },
                position: { x: 0, y: 0 }
            });
            if (parentId) {
                initialEdges.push({
                    id: `${parentId}-${id}`, source: parentId, target: id,
                    type: 'smoothstep', animated: true, hidden: isHidden
                });
            }
            node.children?.forEach(child => flattenTree(child, id, depth + 1));
        };
        flattenTree(data);
        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(initialNodes, initialEdges);
        setNodes(lNodes);
        setEdges(lEdges);
        setTimeout(() => fitView({ nodes: [{ id: data.path }], duration: 800, padding: 2 }), 100);
    }, [data, visibleDepth, fitView, handleContextMenu, setNodes, setEdges]);

    const onNodeDragStart = (_: any, node: Node) => {
        dragStartPos.current = { ...node.position };
    };

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

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: 'var(--card-bg)', padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Visible Levels:</span>
                <input type="range" min="1" max="10" value={visibleDepth} onChange={(e) => setVisibleDepth(parseInt(e.target.value))} style={{ cursor: 'pointer' }} />
                <span style={{ fontWeight: 'bold' }}>{visibleDepth}</span>
            </div>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} onNodeDragStart={onNodeDragStart} onNodeDrag={onNodeDrag} fitView snapToGrid snapGrid={[15, 15]}>
                <Background color="#333" gap={20} /><Controls /><MiniMap nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
        </div>
    );
};

export const VisualTree: React.FC<{ data: FileNode }> = (props) => (
    <ReactFlowProvider><VisualTreeInner {...props} /></ReactFlowProvider>
);
