
import * as THREE from 'three';
import { ObjectKind } from '../../types';

export class Object3DFactory {
  static createMesh(kind: ObjectKind, color: string): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({ color, shininess: 80 });
    const glassMaterial = new THREE.MeshPhongMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 });
    const darkMaterial = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const ghostMaterial = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.2 });

    switch (kind) {
      // --- VEHICLES ---
      case ObjectKind.CAR:
      case ObjectKind.FOLLOW_CAR:
      case ObjectKind.COOP_VEH_FUSE:
      case ObjectKind.WINGDOOR:
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 4.4), material);
        body.position.y = 0.4;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), glassMaterial);
        roof.position.set(0, 1.1, -0.2);
        group.add(body, roof);
        break;

      case ObjectKind.TRUCK:
      case ObjectKind.FIRE_TRUCK:
      case ObjectKind.TRAILER:
      case ObjectKind.STEAM_HEAVY:
      case ObjectKind.STEAM_LIGHT:
        const tBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 7.5), material);
        tBody.position.y = 1.25;
        const tCabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.2, 1.6), glassMaterial);
        tCabin.position.set(0, 2.0, -2.9);
        group.add(tBody, tCabin);
        break;

      case ObjectKind.BUS:
        const bBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 10.5), material);
        bBody.position.y = 1.5;
        const bGlass = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.8, 9.5), glassMaterial);
        bGlass.position.y = 2.2;
        group.add(bBody, bGlass);
        break;

      case ObjectKind.EXPRESS_CARGO:
        const cargoBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 5.0), material);
        cargoBody.position.y = 1.0;
        const cargoCab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.2), glassMaterial);
        cargoCab.position.set(0, 1.5, -1.9);
        group.add(cargoBody, cargoCab);
        break;

      case ObjectKind.AGV:
        const agvBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.6), material);
        agvBase.position.y = 0.2;
        const agvSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16), darkMaterial);
        agvSensor.position.y = 0.5;
        group.add(agvBase, agvSensor);
        break;

      // --- PEDESTRIANS & ANIMALS ---
      case ObjectKind.HUMAN:
      case ObjectKind.FOLLOW_HUMAN:
      case ObjectKind.DOLLY_HUMAN_SHUTTLE:
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 4, 8), material);
        torso.position.y = 0.7;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), material);
        head.position.y = 1.4;
        group.add(torso, head);
        break;

      case ObjectKind.ANIMAL:
        const aBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.0), material);
        aBody.position.y = 0.45;
        const aHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), material);
        aHead.position.set(0, 0.7, 0.5);
        group.add(aBody, aHead);
        break;

      case ObjectKind.BIRD:
        const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), material);
        birdBody.position.y = 2.0; // Assume flying
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.1), material);
        wingL.position.set(0.25, 2.0, 0);
        const wingR = wingL.clone();
        wingR.position.set(-0.25, 2.0, 0);
        group.add(birdBody, wingL, wingR);
        break;

      case ObjectKind.BICYCLE:
      case ObjectKind.TRIPLE_WHEEL:
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 1.6), darkMaterial);
        frameMesh.position.y = 0.5;
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const w1 = new THREE.Mesh(wheelGeo, darkMaterial);
        w1.position.set(0, 0.35, -0.7);
        const w2 = w1.clone();
        w2.position.set(0, 0.35, 0.7);
        group.add(frameMesh, w1, w2);
        break;

      // --- INFRASTRUCTURE & MARKERS ---
      case ObjectKind.POLE:
      case ObjectKind.PILLAR:
      case ObjectKind.TRUNK:
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6, 12), material);
        pole.position.y = 3;
        group.add(pole);
        break;

      case ObjectKind.CONE:
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 16), material);
        cone.position.y = 0.35;
        group.add(cone);
        break;

      case ObjectKind.SIGN_BOARD:
      case ObjectKind.BOARD:
      case ObjectKind.BRAND:
        const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 8), darkMaterial);
        sPole.position.y = 1.5;
        const sBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), material);
        sBoard.position.set(0, 2.6, 0);
        group.add(sPole, sBoard);
        break;

      case ObjectKind.BOOM_BARRIER:
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), darkMaterial);
        base.position.y = 0.5;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 5), material);
        arm.position.set(0, 0.8, 2.5);
        group.add(base, arm);
        break;

      case ObjectKind.CROSS_BAR:
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 8), material);
        bar.rotation.z = Math.PI / 2;
        bar.position.y = 2.5;
        group.add(bar);
        break;

      case ObjectKind.ROLLING_DOOR:
        const door = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.1), material);
        door.position.y = 1.5;
        group.add(door);
        break;

      // --- INDUSTRIAL & UTILITY ---
      case ObjectKind.LIFTER:
        const liftBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.0), material);
        liftBase.position.y = 0.4;
        const fork1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 1.2), darkMaterial);
        fork1.position.set(0.3, 0.1, 1.4);
        const fork2 = fork1.clone();
        fork2.position.set(-0.3, 0.1, 1.4);
        group.add(liftBase, fork1, fork2);
        break;

      case ObjectKind.DOLLY:
      case ObjectKind.DOLLY_BLOCK:
        const dollyPlat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 2.5), material);
        dollyPlat.position.y = 0.15;
        group.add(dollyPlat);
        break;

      case ObjectKind.RADAR:
        const rBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 16), darkMaterial);
        rBase.position.y = 0.75;
        const rDish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
        rDish.position.y = 1.5;
        group.add(rBase, rDish);
        break;

      case ObjectKind.TUNNEL_FAN:
        const fanCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16), material);
        fanCyl.rotation.x = Math.PI / 2;
        fanCyl.position.y = 4.0;
        group.add(fanCyl);
        break;

      // --- OBSTACLES & AREAS ---
      case ObjectKind.SPEED_BUMP:
        const bump = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 0.6), material);
        bump.position.y = 0.05;
        group.add(bump);
        break;

      case ObjectKind.HOLE:
        const hole = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), darkMaterial);
        hole.rotation.x = -Math.PI / 2;
        hole.position.y = 0.01;
        group.add(hole);
        break;

      case ObjectKind.BLIND_AREA:
      case ObjectKind.DOLLY_BLIND_AREA:
      case ObjectKind.NOISE_OBJ:
        const areaBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), ghostMaterial);
        areaBox.position.y = 1.0;
        group.add(areaBox);
        break;

      case ObjectKind.AIRPLANE:
        const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 12), material);
        fus.rotation.x = Math.PI / 2;
        fus.position.y = 5;
        const wings = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 1.8), material);
        wings.position.y = 5;
        group.add(fus, wings);
        break;

      case ObjectKind.SMALL_OBJ:
        const sBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), material);
        sBox.position.y = 0.15;
        group.add(sBox);
        break;

      case ObjectKind.HIGH_OBJ:
        const hBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), material);
        hBox.position.y = 2.0;
        group.add(hBox);
        break;

      case ObjectKind.BOX:
        const boxObj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        boxObj.position.y = 0.5;
        group.add(boxObj);
        break;

      case ObjectKind.STATIC:
      default:
        const genBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        genBox.position.y = 0.5;
        group.add(genBox);
        break;
    }
    return group;
  }
}
