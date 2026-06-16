"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DEMO_PLAYBACK_ID = process.argv[2] ?? 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe';
async function main() {
    console.log('🎬 Insertando grabación de prueba...');
    console.log(`   muxPlaybackId: ${DEMO_PLAYBACK_ID}`);
    const event = await prisma.event.findUnique({ where: { id: 'evt-seed-001' } });
    if (!event) {
        console.error('❌ Evento evt-seed-001 no encontrado. Corré el seed principal primero:');
        console.error('   npx ts-node prisma/seed.ts');
        process.exit(1);
    }
    const recording = await prisma.recording.upsert({
        where: { id: 'rec-seed-001' },
        update: {
            muxPlaybackId: DEMO_PLAYBACK_ID,
            muxAssetId: `asset-${DEMO_PLAYBACK_ID}`,
        },
        create: {
            id: 'rec-seed-001',
            eventId: 'evt-seed-001',
            title: 'INVS Live Session #1 — Grabación',
            description: 'Grabación completa del evento. Disponible para suscriptores.',
            muxAssetId: `asset-${DEMO_PLAYBACK_ID}`,
            muxPlaybackId: DEMO_PLAYBACK_ID,
            duration: 3600,
            isPublic: false,
            requiresSubscription: true,
        },
    });
    console.log(`✅ Grabación creada: ${recording.id}`);
    console.log(`   Título: ${recording.title}`);
    console.log(`   HLS URL: https://stream.mux.com/${recording.muxPlaybackId}.m3u8`);
    console.log('');
    console.log('📱 Para verla en la app, usá el endpoint:');
    console.log(`   GET /api/v1/recordings/${recording.id}/token`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Si el asset NO existe en tu cuenta Mux,');
    console.log('   el signed token fallará. Usá el demo público de Mux o');
    console.log('   pasá tu propio playbackId como argumento:');
    console.log('   npx ts-node prisma/seed-recording.ts <TU_PLAYBACK_ID>');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-recording.js.map