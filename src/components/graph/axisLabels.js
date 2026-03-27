import * as THREE from 'three'
import SpriteText from 'three-spritetext'

/**
 * Create a faint baseline for the Arc Diagram (Généalogie view).
 */
export function createGenealogyOverlay() {
  const group = new THREE.Group()
  group.name = 'genealogy-overlay'

  // Horizontal baseline
  const HALF_WIDTH = 800
  const points = [
    new THREE.Vector3(-HALF_WIDTH, 0, 0),
    new THREE.Vector3(HALF_WIDTH, 0, 0),
  ]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
  })
  group.add(new THREE.Line(geometry, material))

  // Time arrow labels
  const pastLabel = new SpriteText('PASSÉ', 6, 'rgba(255,255,255,0.18)')
  pastLabel.fontWeight = 'bold'
  pastLabel.backgroundColor = 'rgba(6,3,15,0.4)'
  pastLabel.padding = 2
  pastLabel.borderRadius = 2
  pastLabel.position.set(-HALF_WIDTH + 40, -25, 0)
  group.add(pastLabel)

  const futureLabel = new SpriteText('PRÉSENT', 6, 'rgba(255,255,255,0.18)')
  futureLabel.fontWeight = 'bold'
  futureLabel.backgroundColor = 'rgba(6,3,15,0.4)'
  futureLabel.padding = 2
  futureLabel.borderRadius = 2
  futureLabel.position.set(HALF_WIDTH - 40, -25, 0)
  group.add(futureLabel)

  return group
}
