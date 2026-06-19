from rest_framework import serializers

from api.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'lu', 'type_notification', 'cree_le')
        read_only_fields = ('id', 'message', 'type_notification', 'cree_le')
