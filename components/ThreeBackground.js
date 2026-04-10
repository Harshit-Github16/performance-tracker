"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 45;
    camera.position.y = 25;
    camera.rotation.x = -Math.PI / 3.5;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- High-End Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(0, 30, 20);
    scene.add(pointLight);

    // --- The Premium Field (Checks / Waving Grid) ---
    const materialWire = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.05 // Subtle checks
    });

    const gridRows = 80;
    const gridCols = 80;
    const planeGeom = new THREE.PlaneGeometry(220, 220, gridRows, gridCols);
    const plane = new THREE.Mesh(planeGeom, materialWire);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Original positions for displacement
    const originalPositions = new Float32Array(planeGeom.attributes.position.array);

    // --- Point Cloud (Glow Nodes at Intersections) ---
    const ptsCount = (gridRows + 1) * (gridCols + 1);
    const ptsGeom = new THREE.BufferGeometry();
    const ptsPos = new Float32Array(ptsCount * 3);
    ptsGeom.setAttribute('position', new THREE.BufferAttribute(ptsPos, 3));
    
    // We'll update point positions to match grid vertices in the loop
    const ptsMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x000000,
        transparent: true,
        opacity: 0.1
    });
    const pointsMesh = new THREE.Points(ptsGeom, ptsMat);
    scene.add(pointsMesh);

    // --- Interaction ---
    const handleMouseMove = (event) => {
        mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // --- Animation Loop ---
    let frameId;
    const animate = () => {
        const time = Date.now() * 0.0006;
        const positions = plane.geometry.attributes.position.array;
        const ptsBuffer = pointsMesh.geometry.attributes.position.array;
        
        // Target focus area (mouse position translated to grid space)
        const targetX = mouse.current.x * 70;
        const targetZ = -mouse.current.y * 70;

        for (let i = 0; i < positions.length; i += 3) {
            const x = originalPositions[i];
            const y = originalPositions[i + 1];
            
            // Multilayered Wave Simulation
            const noise = Math.sin(x * 0.08 + time) * 1.5 + 
                          Math.cos(y * 0.08 + time * 0.8) * 1.5;
            
            // Mouse Interaction Logic (Lifting the grid)
            const dx = x - targetX;
            const dy = y - targetZ;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.max(0, (25 - distance) / 25);
            const interactionLift = force * 10;
            
            // Update Mesh Vertical Position
            const finalZ = noise + interactionLift;
            positions[i + 2] = finalZ;

            // Sync GLOW POINTS with the grid
            // Grid geometry is 平面 (x, y, z=0), but plane rotation makes it floor
            // After rotation, mesh position i+2 is the VERTICAL height
            ptsBuffer[i] = positions[i];
            ptsBuffer[i + 1] = positions[i + 1];
            ptsBuffer[i + 2] = positions[i + 2];
        }
        
        plane.geometry.attributes.position.needsUpdate = true;
        pointsMesh.geometry.attributes.position.needsUpdate = true;

        // Subtle spotlight follow
        pointLight.position.x = targetX;
        pointLight.position.z = targetZ;

        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handleMouseMove);
        cancelAnimationFrame(frameId);
        plane.geometry.dispose();
        plane.material.dispose();
        ptsGeom.dispose();
        ptsMat.dispose();
        renderer.dispose();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
