import SpriteText from 'three-spritetext'
import * as THREE from 'three'
import { blendAxesColors } from '../../categories'
import { getGradientTexture } from './scene'

export function createNodeThreeObject({ node, selectedNode, connectedNodes, isNodeVisible, hoveredFilter }) {
  const isSelectedContext = !selectedNode || connectedNodes.has(node.id)
  const isFiltered = isNodeVisible(node)
  const isActive = isSelectedContext && isFiltered

  const nodeAxes = node.axes || []
  const matchesHover = hoveredFilter && nodeAxes.includes(hoveredFilter)
  const dimmedByHover = hoveredFilter && !matchesHover

  const opacity = dimmedByHover ? 0.06 : isActive ? 1 : 0.1
  const glowIntensity = matchesHover ? 0.35 : 0.15
  const glowRadius = matchesHover ? 8.5 : 6.5

  const group = new THREE.Group()
  const blendedColor = blendAxesColors(nodeAxes)

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(4, 24, 24),
    nodeAxes.length > 1
      ? new THREE.MeshBasicMaterial({ map: getGradientTexture(nodeAxes), transparent: true, opacity })
      : new THREE.MeshBasicMaterial({ color: new THREE.Color(blendedColor), transparent: true, opacity })
  )
  group.add(sphere)

  if (isActive || matchesHover) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(glowRadius, 20, 20),
      new THREE.MeshBasicMaterial({ color: blendedColor, transparent: true, opacity: glowIntensity })
    )
    group.add(glow)

    if (matchesHover) {
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(11, 16, 16),
        new THREE.MeshBasicMaterial({ color: blendedColor, transparent: true, opacity: 0.08 })
      )
      group.add(bloom)
    }
  }

  const label = new SpriteText(`${node.title}\n${node.author}`)
  label.color = isActive || matchesHover ? '#ffffff' : 'rgba(255,255,255,0.1)'
  label.textHeight = 2.8
  label.fontFace = "'Space Grotesk', system-ui, sans-serif"
  label.backgroundColor = isActive || matchesHover ? 'rgba(0, 0, 0, 0.65)' : 'transparent'
  label.padding = 1.5
  label.borderRadius = 3
  label.position.set(0, 10, 0)
  group.add(label)

  return group
}
