import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { AppButton, EmptyState, Metric, SectionHeader, StatusBadge, SurfaceCard } from '../components/Ui';
import { getJobStatus, getLatestExtraction, uploadDocument } from '../services/api/finguard';
import { pickPdfDocument } from '../services/native/documentPicker';
import { queryKeys } from '../services/queryKeys';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import type { DocumentType, JobStatusResponse, UploadAcceptedResponse } from '../types';
import { sentenceCase } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

function buildPendingJob(response: UploadAcceptedResponse): JobStatusResponse {
  const now = new Date().toISOString();
  return {
    job_id: response.job_id,
    user_id: '',
    type: response.type,
    status: response.status,
    result: null,
    error: null,
    created_at: now,
    updated_at: now,
  };
}

export function UploadScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const jobs = useAppStore((state) => state.jobs);
  const setJob = useAppStore((state) => state.setJob);
  const clearDerivedForDocument = useAppStore((state) => state.clearDerivedForDocument);
  const [feedback, setFeedback] = useState<string | null>(null);

  const form16ExtractionQuery = useQuery({
    queryKey: queryKeys.extraction('form16'),
    queryFn: () => getLatestExtraction('form16'),
  });
  const camsExtractionQuery = useQuery({
    queryKey: queryKeys.extraction('cams'),
    queryFn: () => getLatestExtraction('cams'),
  });

  const form16JobQuery = useQuery({
    queryKey: queryKeys.job(jobs.form16?.job_id ?? null),
    queryFn: () => getJobStatus(jobs.form16!.job_id),
    enabled: Boolean(jobs.form16?.job_id),
    refetchInterval: (query) => {
      const status = (query.state.data as JobStatusResponse | undefined)?.status ?? jobs.form16?.status;
      return status === 'pending' || status === 'processing' ? 2500 : false;
    },
  });

  const camsJobQuery = useQuery({
    queryKey: queryKeys.job(jobs.cams?.job_id ?? null),
    queryFn: () => getJobStatus(jobs.cams!.job_id),
    enabled: Boolean(jobs.cams?.job_id),
    refetchInterval: (query) => {
      const status = (query.state.data as JobStatusResponse | undefined)?.status ?? jobs.cams?.status;
      return status === 'pending' || status === 'processing' ? 2500 : false;
    },
  });

  useEffect(() => {
    if (!form16JobQuery.data) {
      return;
    }
    setJob('form16', form16JobQuery.data);
    if (form16JobQuery.data.status === 'completed') {
      clearDerivedForDocument('form16');
      queryClient.invalidateQueries({ queryKey: queryKeys.extraction('form16') });
      setFeedback('Salary Tax Form upload finished. Open review to inspect and correct the fields.');
    }
  }, [clearDerivedForDocument, form16JobQuery.data, queryClient, setJob]);

  useEffect(() => {
    if (!camsJobQuery.data) {
      return;
    }
    setJob('cams', camsJobQuery.data);
    if (camsJobQuery.data.status === 'completed') {
      clearDerivedForDocument('cams');
      queryClient.invalidateQueries({ queryKey: queryKeys.extraction('cams') });
      setFeedback('Mutual Fund Statement upload finished. Open review to inspect and normalize the holdings.');
    }
  }, [camsJobQuery.data, clearDerivedForDocument, queryClient, setJob]);

  const uploadMutation = useMutation({
    mutationFn: async (documentType: DocumentType) => {
      const asset = await pickPdfDocument();
      if (!asset) {
        return null;
      }
      const response = await uploadDocument(documentType, asset);
      return { documentType, response };
    },
    onSuccess: (result) => {
      if (!result) {
        setFeedback('Upload cancelled.');
        return;
      }
      clearDerivedForDocument(result.documentType);
      setJob(result.documentType, buildPendingJob(result.response));
      queryClient.invalidateQueries({ queryKey: queryKeys.job(result.response.job_id) });
      setFeedback(
        `${result.response.filename} uploaded. Extraction is running in the background.`,
      );
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Upload failed.');
    },
  });

  const activeJob = uploadMutation.isPending
    ? 'Uploading PDF...'
    : jobs.form16?.status === 'processing' || jobs.cams?.status === 'processing'
      ? 'Extraction in progress...'
      : null;

  return (
    <ScreenScaffold
      eyebrow="Uploads"
      title="Upload Documents"
      subtitle="Pick a PDF, let the backend extract and structure it, then jump into the review editor before analysis runs."
    >
      <SurfaceCard>
        <SectionHeader
          title="Start Extracting"
          subtitle="The picker expects a PDF. The backend handles direct extraction, OCR fallback, and structured output."
          aside={
            activeJob ? <ActivityIndicator size="small" color={palette.accent} /> : undefined
          }
        />
        <View style={styles.buttonRow}>
          <AppButton
            label={uploadMutation.isPending ? 'Working...' : 'Upload Salary Tax Form'}
            onPress={() => uploadMutation.mutate('form16')}
            disabled={uploadMutation.isPending}
          />
          <AppButton
            label={uploadMutation.isPending ? 'Working...' : 'Upload MF Statement'}
            onPress={() => uploadMutation.mutate('cams')}
            disabled={uploadMutation.isPending}
            variant="secondary"
          />
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {activeJob ? <Text style={styles.feedback}>{activeJob}</Text> : null}
      </SurfaceCard>

      <UploadStatusCard
        title="Salary Tax Form (Form 16)"
        job={jobs.form16 ?? form16JobQuery.data ?? null}
        extraction={form16ExtractionQuery.data ?? null}
        onReview={() =>
          navigation.navigate('FeatureDetail', {
            kind: 'review',
            documentType: 'form16',
          })
        }
      />
      <UploadStatusCard
        title="Mutual Fund Statement (CAMS)"
        job={jobs.cams ?? camsJobQuery.data ?? null}
        extraction={camsExtractionQuery.data ?? null}
        onReview={() =>
          navigation.navigate('FeatureDetail', {
            kind: 'review',
            documentType: 'cams',
          })
        }
      />

      {!form16ExtractionQuery.data && !camsExtractionQuery.data ? (
        <EmptyState
          title="Nothing extracted yet"
          body="Once a job completes, the latest extraction summary for each document type appears here."
        />
      ) : null}
    </ScreenScaffold>
  );
}

type UploadStatusCardProps = {
  title: string;
  job: JobStatusResponse | null;
  extraction: Awaited<ReturnType<typeof getLatestExtraction>>;
  onReview: () => void;
};

function UploadStatusCard({ title, job, extraction, onReview }: UploadStatusCardProps) {
  return (
    <SurfaceCard tone="soft">
      <SectionHeader
        title={title}
        subtitle="Latest backend state for this document type."
        aside={
          job ? (
            <StatusBadge
              label={sentenceCase(job.status)}
              tone={
                job.status === 'completed'
                  ? 'success'
                  : job.status === 'failed'
                    ? 'danger'
                    : 'warning'
              }
            />
          ) : extraction ? (
            <StatusBadge
              label={sentenceCase(extraction.validation.status)}
              tone={
                extraction.validation.status === 'complete'
                  ? 'success'
                  : extraction.validation.status === 'partial'
                    ? 'warning'
                    : 'danger'
              }
            />
          ) : undefined
        }
      />
      {job ? (
        <View style={styles.metrics}>
          <Metric label="Processing Status" value={sentenceCase(job.status)} />
          <Metric label="Last update" value={new Date(job.updated_at).toLocaleTimeString('en-IN')} />
        </View>
      ) : null}
      {extraction ? (
        <>
          <View style={styles.metrics}>
            <Metric label="Missing fields" value={String(extraction.validation.missing_fields.length)} />
            <Metric label="Blocking fields" value={String(extraction.validation.blocking_fields.length)} />
          </View>
          <AppButton label="Review Extracted Data" onPress={onReview} />
        </>
      ) : (
        <Text style={styles.helper}>No extracted payload stored yet.</Text>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    gap: spacing.sm,
  },
  feedback: {
    lineHeight: 21,
  },
  helper: {
    color: palette.muted,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
});
