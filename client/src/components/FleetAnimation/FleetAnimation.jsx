import React from 'react';
import Icons from '../Icons/Icons';
import './FleetAnimation.css';

/**
 * FleetAnimation Component - V5 (Lightweight Neural Fleet)
 * A clean, subtle network animation with thin lines, connected dots, 
 * and non-bold fleet icons for a professional, technical backdrop.
 */
function FleetAnimation() {
  // Define a grid of neural nodes
  const nodes = [
    { x: 100, y: 100 }, { x: 300, y: 150 }, { x: 500, y: 100 }, { x: 700, y: 150 }, { x: 900, y: 100 },
    { x: 200, y: 300 }, { x: 400, y: 350 }, { x: 600, y: 300 }, { x: 800, y: 350 },
    { x: 100, y: 500 }, { x: 300, y: 450 }, { x: 500, y: 500 }, { x: 700, y: 450 }, { x: 900, y: 500 },
  ];

  // Define connections (lines) between nodes
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 8], [4, 8],
    [5, 9], [5, 10], [6, 10], [6, 11], [7, 11], [7, 12], [8, 12], [8, 13],
    [9, 10], [10, 11], [11, 12], [12, 13]
  ];

  return (
    <div className="fleet-animation-container">
      <svg className="fleet-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Connection Lines */}
        {connections.map(([from, to], i) => (
          <g key={`line-${i}`}>
            <line 
              x1={nodes[from].x} y1={nodes[from].y} 
              x2={nodes[to].x} y2={nodes[to].y} 
              className="network-line" 
            />
            {i % 4 === 0 && (
              <line 
                x1={nodes[from].x} y1={nodes[from].y} 
                x2={nodes[to].x} y2={nodes[to].y} 
                className="network-line-pulse" 
              />
            )}
          </g>
        ))}

        {/* Nodes (Dots) */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <circle cx={node.x} cy={node.y} r="3" className="network-dot" />
            {i % 3 === 0 && (
              <circle cx={node.x} cy={node.y} r="5" className="network-dot-pulse" />
            )}
          </g>
        ))}

        {/* Subtle, Non-Bold Icons */}
        <SubtleIcon x={nodes[1].x} y={nodes[1].y} icon="Truck" delay="0s" />
        <SubtleIcon x={nodes[3].x} y={nodes[3].y} icon="Database" delay="2s" />
        <SubtleIcon x={nodes[6].x} y={nodes[6].y} icon="BarChart" delay="4s" />
        <SubtleIcon x={nodes[8].x} y={nodes[8].y} icon="Settings" delay="6s" />
        <SubtleIcon x={nodes[11].x} y={nodes[11].y} icon="Truck" delay="1s" />
        
        {/* Optimization Particles */}
        <circle cx="50" cy="50" r="1.5" className="particle particle-move" transform="translate(400, 350)" />
        <circle cx="50" cy="50" r="1.5" className="particle particle-move" transform="translate(600, 300)" style={{ animationDelay: '5s' }} />
        <circle cx="50" cy="50" r="1.5" className="particle particle-move" transform="translate(200, 300)" style={{ animationDelay: '10s' }} />
      </svg>
    </div>
  );
}

function SubtleIcon({ x, y, icon, delay }) {
  const IconComponent = Icons[icon] || Icons.Truck;
  return (
    <g transform={`translate(${x - 12}, ${y - 12})`} className="subtle-icon moving-icon" style={{ animationDelay: delay }}>
      <IconComponent size={24} />
    </g>
  );
}

export default FleetAnimation;
