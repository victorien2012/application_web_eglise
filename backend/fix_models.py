import sys

with open('api/models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
for line in lines:
    out.append(line)
    if 'class Meta:' in line and len(out) > 340 and 'annonces' in lines[len(out)]:
        pass
    if 'db_table = \'annonces\'' in line:
        # Keep next line ordering
        out.append(lines[len(out)])
        break

out.append('\n')
out.append('    def __str__(self):\n')
out.append('        return self.titre\n\n\n')

model_str = """class CarrouselMedia(models.Model):
    TYPE_MEDIA_CHOICES = [
        ('IMAGE', 'Image'),
        ('VIDEO', 'Vidéo'),
    ]

    titre = models.CharField(max_length=255, blank=True, null=True, db_column='titre')
    description = models.TextField(blank=True, null=True, db_column='description')
    fichier = models.FileField(upload_to='carrousel/', blank=True, null=True, db_column='fichier', help_text='Fichier image.')
    url_video = models.URLField(blank=True, null=True, db_column='url_video', help_text='Lien YouTube si le type est Vidéo.')
    type_media = models.CharField(max_length=10, choices=TYPE_MEDIA_CHOICES, default='IMAGE', db_column='type_media')
    est_actif = models.BooleanField(default=True, db_column='est_actif', help_text='Indique si le média doit être affiché dans le carrousel.')
    ordre = models.IntegerField(default=0, db_column='ordre', help_text='Ordre daffichage du média dans le carrousel.')
    cree_le = models.DateTimeField(auto_now_add=True, db_column='cree_le')

    class Meta:
        db_table = 'carrousel_media'
        ordering = ['ordre', '-cree_le']

    def __str__(self):
        return self.titre if self.titre else f"Média {self.id} ({self.type_media})"
"""

with open('api/models.py', 'w', encoding='utf-8') as f:
    f.writelines(out)
    f.write(model_str)
