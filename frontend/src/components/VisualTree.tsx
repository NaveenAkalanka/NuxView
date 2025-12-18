import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    type Node,
    type Edge,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { FileNode } from '../api';
import { Folder } from 'lucide-react';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 36;

// Helper to get folder color based on path or name
const getFolderColor = (path: string) => {
    const name = path.split('/').pop()?.toLowerCase() || '';
    const wellKnown: Record<string, string> = {
        'bin': '#22c55e', // green
        'etc': '#ef4444', // red
        'home': '#3b82f6', // blue
        'usr': '#a855f7', // purple
        'var': '#f59e0b', // amber
        'root': '#ec4899', // pink
        'dev': '#06b6d4', // cyan
        'boot': '#84cc16', // lime
        'sys': '#6366f1', // indigo
        'proc': '#94a3b8' // slate
    };

    if (wellKnown[name]) return wellKnown[name];

    // Hash fallback
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = path.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#38bdf8', '#fbbf24', '#f87171', '#c084fc', '#4ade80', '#fb7185'];
    return colors[Math.abs(hash) % colors.length];
};

// Custom Node Component
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

interface VisualTreeProps {
    data: FileNode;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // TB layout with ultra-tight horizontal spacing
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 15, ranksep: 60 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// Flatten tree to nodes/edges
const flattenTree = (
    node: FileNode,
    nodes: Node[],
    edges: Edge[],
    parentId: string | null = null,
    depth: number = 0,
    onContextMenu: any
) => {
    const id = node.path;
    const isHidden = depth > 3; // Initially hide > 4 levels (0,1,2,3)

    nodes.push({
        id,
        type: 'folder',
        data: { label: node.name, fullPath: node.path, depth, onContextMenu },
        position: { x: 0, y: 0 }, // layout will fix
        hidden: isHidden,
        style: { opacity: isHidden ? 0 : 1 }, // Animation helper?
    });

    if (parentId) {
        edges.push({
            id: `${parentId}-${id}`,
            source: parentId,
            target: id,
            type: 'smoothstep', // Cleaner vertical connections
            animated: true,
            hidden: isHidden, // Hide edge if target is hidden? actually if either is hidden
        });
    }

    if (node.children) {
        node.children.forEach(child => flattenTree(child, nodes, edges, id, depth + 1, onContextMenu));
    }
};

export const VisualTree: React.FC<VisualTreeProps> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [visibleDepth, setVisibleDepth] = useState(4); // "4 levels" request

    const handleContextMenu = useCallback((e: React.MouseEvent, nodeData: any) => {
        e.preventDefault();
        const query = encodeURIComponent(`linux directory ${nodeData.label} explained`);
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    }, []);

    // Process data on load
    useMemo(() => {
        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];
        flattenTree(data, initialNodes, initialEdges, null, 0, handleContextMenu);

        // Apply layout to EVERYTHING first
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [data, handleContextMenu, setNodes, setEdges]);

    // Handle Depth visibility
    useEffect(() => {
        setNodes((nds) => nds.map((node) => ({
            ...node,
            hidden: (node.data.depth as number) >= visibleDepth
        })));
        setEdges((eds) => eds.map((edge) => {
            // This is a bit expensive, need to check target node depth.
            // Shortcut: We know edges are parent->child.
            // But simplest is to match node visibility.
            // reactflow handles hidden nodes' edges usually, but let's be explicit
            // We need to look up source/target?
            // Actually, if node is hidden, connected edges should be hidden.
            return { ...edge, hidden: false }; // Let RF handle it? 
            // RF hides edge if node is hidden.
        }));
    }, [visibleDepth, setNodes, setEdges]);

    return (
        <div style={{ width: '100%', height: '70vh', border: '1px solid #334155', borderRadius: '12px', background: '#020617' }}>
            {/* Controls overlay */}
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, background: 'rgba(30, 41, 59, 0.8)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Visible Levels: {visibleDepth}</label>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={visibleDepth}
                    onChange={(e) => setVisibleDepth(parseInt(e.target.value))}
                    style={{ accentColor: '#38bdf8' }}
                />
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                attributionPosition="bottom-left"
            >
                <MiniMap nodeStrokeColor="#334155" nodeColor="#1e293b" maskColor="rgba(0, 0, 0, 0.7)" />
                <Controls />
                <Background color="#1e293b" gap={16} />
            </ReactFlow>
        </div>
    );
};
