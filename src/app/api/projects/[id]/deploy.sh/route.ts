import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, projects, harnessGenerations, generatedArtifacts } from '@/db';
import { buildTarGzBase64 } from '@/modules/package-exporter/exporter';
import { AuthService, requireAuthUser } from '@/modules/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const auth = new AuthService();

    let authorized = false;
    if (token && auth.verifyDeploymentToken(projectId, token)) {
      authorized = true;
    } else {
      try {
        const user = await requireAuthUser(req);
        await auth.assertProjectOwnership(projectId, user.userId);
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return new NextResponse(
        'echo "Erreur 401 : Accès non autorisé au script de déploiement (jeton de déploiement manquant ou expiré). Récupérez une commande valide depuis l\'interface web."; exit 1;\n',
        {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    const db = getDb();

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return new NextResponse('echo "Erreur : Projet introuvable"; exit 1;\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const [generation] = await db
      .select()
      .from(harnessGenerations)
      .where(eq(harnessGenerations.projectId, projectId))
      .orderBy(desc(harnessGenerations.createdAt))
      .limit(1);

    if (!generation) {
      return new NextResponse('echo "Erreur : Aucun harnais généré pour ce projet"; exit 1;\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const artifacts = await db
      .select()
      .from(generatedArtifacts)
      .where(eq(generatedArtifacts.generationId, generation.id));

    const files = artifacts
      .filter((a) => a.relativePath && a.content)
      .map((a) => ({
        relativePath: a.relativePath,
        content: a.content,
      }));

    const base64Payload = buildTarGzBase64(files);
    const safeProjectName = project.name.replace(/["`$\\\r\n']/g, '');

    const script = `#!/usr/bin/env bash
set -e
echo "🚀 Déploiement sécurisé du harnais Antigravity pour '${safeProjectName}'..."

# 1. Sauvegarde automatique préalable (Snapshot Guard)
TS=$(date +%Y%m%d-%H%M%S)
if [ -d ".agents" ]; then
  cp -r .agents ".agents.backup-$TS"
  echo "✓ Dossier .agents sauvegardé dans .agents.backup-$TS"
fi
if [ -f "AGENTS.md" ]; then
  cp AGENTS.md "AGENTS.md.backup-$TS"
  echo "✓ AGENTS.md sauvegardé dans AGENTS.md.backup-$TS"
fi

# 2. Décompression directe du harnais complet
echo "${base64Payload}" | base64 -d | tar -xz
echo "✓ ${files.length} fichiers du harnais installés avec succès."

# 3. Alignement des sous-agents préexistants (suppression de tout model: résiduel dans le frontmatter YAML) & archivage des workflows dépréciés
if [ -d ".agents/agents" ]; then
  for ag_file in .agents/agents/*.md; do
    [ -f "$ag_file" ] || continue
    awk 'NR==1 && /^---[[:space:]]*$/ {in_fm=1; print; next} in_fm && /^---[[:space:]]*$/ {in_fm=0; print; next} in_fm && /^model:[[:space:]]*/ {next} {print}' "$ag_file" > "$ag_file.tmp" && mv "$ag_file.tmp" "$ag_file"
  done
  echo "✓ Sous-agents alignés sur .agents/rules/model-effort-governance.md (zéro model: YAML)"
fi
if [ -d ".agents/workflows" ]; then
  mkdir -p .agents/deprecated
  mv .agents/workflows .agents/deprecated/workflows
  echo "✓ Anciens workflows archivés dans .agents/deprecated/workflows"
fi

echo "✅ Harnais Antigravity déployé et opérationnel !"
`;

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/x-shellscript; charset=utf-8',
        'Content-Disposition': 'inline; filename="deploy.sh"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Erreur';
    const safeMsg = rawMsg.replace(/["`$\\\r\n']/g, '');
    return new NextResponse(`echo "Erreur serveur : ${safeMsg}"; exit 1;\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
